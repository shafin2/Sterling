import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKEN } from '../../database/database.module';
import * as schema from '../../database/schema';
import type * as schemaTypes from '../../database/schema';
import type { Env } from '../../config/env.config';

type Plan = 'free' | 'pro' | 'enterprise';

export interface PaymentRecord {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export interface SubscriptionStatus {
  plan: Plan;
  status: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly config: ConfigService<Env>,
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schemaTypes>,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private priceIdForPlan(plan: 'pro' | 'enterprise'): string {
    const key = plan === 'pro' ? 'STRIPE_PRICE_PRO' : 'STRIPE_PRICE_ENTERPRISE';
    const priceId = this.config.get<string>(key);
    if (!priceId) {
      throw new BadRequestException(`Stripe price for plan "${plan}" is not configured`);
    }
    return priceId;
  }

  private planFromPriceId(priceId: string): Plan {
    const proPriceId = this.config.get<string>('STRIPE_PRICE_PRO');
    const enterprisePriceId = this.config.get<string>('STRIPE_PRICE_ENTERPRISE');
    if (priceId === proPriceId) return 'pro';
    if (priceId === enterprisePriceId) return 'enterprise';
    return 'free';
  }

  private get webUrl(): string {
    return this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
  }

  // ─── Get or create Stripe customer for a tenant ─────────────────────────────

  private async getOrCreateStripeCustomer(
    tenantId: string,
    email: string,
  ): Promise<string> {
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email,
      metadata: { tenantId },
    });

    await this.db
      .update(schema.tenants)
      .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
      .where(eq(schema.tenants.id, tenantId));

    return customer.id;
  }

  // ─── Create Checkout Session ────────────────────────────────────────────────

  async createCheckoutSession(
    tenantId: string,
    plan: 'pro' | 'enterprise',
    email: string,
  ): Promise<{ url: string }> {
    const customerId = await this.getOrCreateStripeCustomer(tenantId, email);
    const priceId = this.priceIdForPlan(plan);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.webUrl}/app/settings?tab=billing&success=1`,
      cancel_url: `${this.webUrl}/app/settings?tab=billing`,
      metadata: { tenantId, plan },
      subscription_data: {
        metadata: { tenantId, plan },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new BadRequestException('Failed to create Stripe checkout session');
    }

    return { url: session.url };
  }

  // ─── Create Portal Session ──────────────────────────────────────────────────

  async createPortalSession(tenantId: string): Promise<{ url: string }> {
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.stripeCustomerId) {
      throw new BadRequestException('No active Stripe subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${this.webUrl}/app/settings?tab=billing`,
    });

    return { url: session.url };
  }

  // ─── Payment History ────────────────────────────────────────────────────────

  async getPaymentHistory(tenantId: string): Promise<PaymentRecord[]> {
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });
    if (!tenant?.stripeCustomerId) return [];

    try {
      const invoices = await this.stripe.invoices.list({
        customer: tenant.stripeCustomerId,
        limit: 24,
      });
      return invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number ?? inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        amount: inv.amount_paid,
        currency: inv.currency.toUpperCase(),
        status: inv.status ?? 'unknown',
        periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
        periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        pdfUrl: inv.invoice_pdf ?? null,
        hostedUrl: inv.hosted_invoice_url ?? null,
      }));
    } catch (err) {
      this.logger.warn(`getPaymentHistory failed for tenant ${tenantId}: ${String(err)}`);
      return [];
    }
  }

  // ─── Get Subscription Status ────────────────────────────────────────────────

  async getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Self-heal: customer exists but webhook missed → look up active subscription from Stripe
    if (!tenant.stripeSubscriptionId && tenant.stripeCustomerId) {
      try {
        const subs = await this.stripe.subscriptions.list({
          customer: tenant.stripeCustomerId,
          status: 'active',
          limit: 1,
        });
        const sub = subs.data[0];
        if (sub) {
          const priceId = sub.items.data[0]?.price.id ?? '';
          const plan = this.planFromPriceId(priceId);
          // Write back so future calls are fast
          await this.db
            .update(schema.tenants)
            .set({ plan, stripeSubscriptionId: sub.id, updatedAt: new Date() })
            .where(eq(schema.tenants.id, tenantId));
          this.logger.log(`Self-healed tenant ${tenantId} → plan: ${plan}, sub: ${sub.id}`);
          return {
            plan,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          };
        }
      } catch (err) {
        this.logger.warn(`Self-heal lookup failed for tenant ${tenantId}: ${String(err)}`);
      }
      return {
        plan: (tenant.plan as Plan) ?? 'free',
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    if (!tenant.stripeSubscriptionId) {
      return {
        plan: (tenant.plan as Plan) ?? 'free',
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        tenant.stripeSubscriptionId,
      );

      const priceId = subscription.items.data[0]?.price.id ?? '';
      const plan = this.planFromPriceId(priceId);

      return {
        plan,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (err) {
      this.logger.warn(
        `Failed to retrieve Stripe subscription ${tenant.stripeSubscriptionId}: ${String(err)}`,
      );
      return {
        plan: (tenant.plan as Plan) ?? 'free',
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
  }

  // ─── Webhook Handler ────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, sig: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(err)}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_succeeded':
        // Plan is already set by checkout.session.completed or subscription.updated
        break;
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.warn(
          `Payment failed for customer ${invoice.customer} on subscription ${invoice.subscription}`,
        );
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const tenantId = session.metadata?.['tenantId'];
    if (!tenantId) {
      this.logger.warn('checkout.session.completed: missing tenantId in metadata');
      return;
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null;

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    // Determine plan from the subscription's price
    let plan: Plan = 'free';
    if (subscriptionId) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id ?? '';
        plan = this.planFromPriceId(priceId);
      } catch (err) {
        this.logger.warn(`Could not retrieve subscription ${subscriptionId}: ${String(err)}`);
        plan = (session.metadata?.['plan'] as Plan) ?? 'free';
      }
    } else {
      plan = (session.metadata?.['plan'] as Plan) ?? 'free';
    }

    await this.db
      .update(schema.tenants)
      .set({
        plan,
        ...(customerId && { stripeCustomerId: customerId }),
        ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenantId));

    this.logger.log(`Tenant ${tenantId} upgraded to plan: ${plan}`);
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = subscription.metadata?.['tenantId'];
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id ?? null;

    if (!tenantId && !customerId) {
      this.logger.warn('subscription.updated: no tenantId or customerId to identify tenant');
      return;
    }

    const priceId = subscription.items.data[0]?.price.id ?? '';
    const plan = this.planFromPriceId(priceId);

    if (tenantId) {
      await this.db
        .update(schema.tenants)
        .set({ plan, updatedAt: new Date() })
        .where(eq(schema.tenants.id, tenantId));
      this.logger.log(`Tenant ${tenantId} subscription updated → plan: ${plan}`);
    } else if (customerId) {
      await this.db
        .update(schema.tenants)
        .set({ plan, updatedAt: new Date() })
        .where(eq(schema.tenants.stripeCustomerId, customerId));
      this.logger.log(`Tenant with customer ${customerId} subscription updated → plan: ${plan}`);
    }
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = subscription.metadata?.['tenantId'];
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id ?? null;

    if (!tenantId && !customerId) {
      this.logger.warn('subscription.deleted: no tenantId or customerId to identify tenant');
      return;
    }

    if (tenantId) {
      await this.db
        .update(schema.tenants)
        .set({ plan: 'free', stripeSubscriptionId: null, updatedAt: new Date() })
        .where(eq(schema.tenants.id, tenantId));
      this.logger.log(`Tenant ${tenantId} downgraded to free (subscription deleted)`);
    } else if (customerId) {
      await this.db
        .update(schema.tenants)
        .set({ plan: 'free', stripeSubscriptionId: null, updatedAt: new Date() })
        .where(eq(schema.tenants.stripeCustomerId, customerId));
      this.logger.log(`Tenant with customer ${customerId} downgraded to free (subscription deleted)`);
    }
  }
}
