import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { QUEUE_REMINDERS, QUEUE_EMAIL } from '../queues.module';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { DrizzleDb } from '../../../database/drizzle.types';
import { invoices, clients } from '../../../database/schema';
import { and, eq, sql, isNull, or, lt } from 'drizzle-orm';
import {
  invoiceReminderHtml,
  invoiceReminderText,
  type ReminderType,
} from '../../auth/email-templates';
import { formatMoney } from '@sterling/shared';

// Gap between reminder sends for the same invoice — 24 hours minus a small buffer
const REMINDER_COOLDOWN_HOURS = 23;

@Injectable()
@Processor(QUEUE_REMINDERS)
export class OverdueProcessor extends WorkerHost {
  private readonly logger = new Logger(OverdueProcessor.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDb,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'check-overdue') {
      await this.markOverdue();
      await this.sendReminders();
    }
  }

  // ── 1. Flip overdue status ─────────────────────────────────────────────────
  private async markOverdue(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]!;
    const result = await this.db
      .update(invoices)
      .set({ status: 'overdue', updatedAt: new Date() } as never)
      .where(and(eq(invoices.status, 'sent'), sql`${invoices.dueDate} < ${today}`))
      .returning({ id: invoices.id });
    this.logger.log(`Overdue cron ran — ${result.length} invoice(s) marked overdue (today: ${today})`);
  }

  // ── 2. Send payment reminders (pre-due 3d, due-today, overdue-notice) ──────
  private async sendReminders(): Promise<void> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]!;
    const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000';

    // Cooldown threshold — skip if lastRemindedAt is within the past 23 hours
    const cooldownThreshold = new Date(now.getTime() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);

    // Helper: determine if an invoice is eligible for a reminder (not reminded recently)
    const notRecentlyReminded = or(
      isNull(invoices.lastRemindedAt),
      lt(invoices.lastRemindedAt, cooldownThreshold),
    );

    // Pre-due: due in exactly 3 days, status=sent
    const threeDaysOut = new Date(now);
    threeDaysOut.setDate(now.getDate() + 3);
    const threeDaysOutStr = threeDaysOut.toISOString().split('T')[0]!;

    const preDueRows = await this.db
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.status, 'sent'),
        sql`${invoices.dueDate} = ${threeDaysOutStr}`,
        notRecentlyReminded,
      ));

    // Due-today: due date = today, status=sent
    const dueTodayRows = await this.db
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.status, 'sent'),
        sql`${invoices.dueDate} = ${todayStr}`,
        notRecentlyReminded,
      ));

    // Overdue-notice: status=overdue, not recently reminded
    const overdueRows = await this.db
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.status, 'overdue'),
        notRecentlyReminded,
      ));

    await this.dispatchReminders(preDueRows, 'pre-due', appUrl);
    await this.dispatchReminders(dueTodayRows, 'due-today', appUrl);
    await this.dispatchReminders(overdueRows, 'overdue-notice', appUrl);
  }

  // ── Helper: send emails and update lastRemindedAt ──────────────────────────
  private async dispatchReminders(
    rows: { invoice: typeof invoices.$inferSelect; client: typeof clients.$inferSelect | null }[],
    type: ReminderType,
    appUrl: string,
  ): Promise<void> {
    for (const { invoice, client } of rows) {
      if (!client?.email) continue;

      const shareUrl = `${appUrl}/invoice/${invoice.shareToken}`;
      const amount = formatMoney(invoice.total, invoice.currency);
      const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-PK', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      const subject = `${type === 'pre-due' ? `Reminder: Invoice ${invoice.number} due in 3 days` : type === 'due-today' ? `Invoice ${invoice.number} is due today` : `Overdue: Invoice ${invoice.number} requires payment`}`;

      await this.emailQueue.add('send', {
        to: client.email,
        subject,
        html: invoiceReminderHtml(
          type,
          client.name,
          invoice.number,
          amount,
          dueDate,
          shareUrl,
          'Your Company', // tenant name — fetched from context in a real multi-tenant call
        ),
        text: invoiceReminderText(
          type,
          client.name,
          invoice.number,
          amount,
          dueDate,
          shareUrl,
          'Your Company',
        ),
      });

      // Stamp lastRemindedAt to prevent duplicate sends within the cooldown window
      await this.db
        .update(invoices)
        .set({ lastRemindedAt: new Date(), updatedAt: new Date() } as never)
        .where(eq(invoices.id, invoice.id));

      this.logger.log(
        `[${type}] Reminder queued for invoice ${invoice.number} → ${client.email}`,
      );
    }
  }
}
