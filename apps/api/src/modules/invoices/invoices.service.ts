import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import {
  invoices, invoiceItems, invoiceSequences, payments, clients,
} from '../../database/schema';
import { and, eq, ilike, or, sql, desc, count } from 'drizzle-orm';
import { QUEUE_PDF, QUEUE_EMAIL } from '../queues/queues.module';
import type {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFiltersDto,
  RecordPaymentDto,
} from '@sterling/shared';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectDrizzle() private readonly db: DrizzleDb,
    @InjectQueue(QUEUE_PDF) private readonly pdfQueue: Queue,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {}

  // ─── Number sequence ────────────────────────────────────────
  private async nextNumber(tenantId: string): Promise<{ seq: number; number: string }> {
    const result = await this.db.execute(sql`
      INSERT INTO invoice_sequences (tenant_id, last_number)
      VALUES (${tenantId}, 1)
      ON CONFLICT (tenant_id)
      DO UPDATE SET last_number = invoice_sequences.last_number + 1
      RETURNING last_number
    `);
    const seq = (result.rows[0] as { last_number: number }).last_number;
    return { seq, number: `INV-${String(seq).padStart(4, '0')}` };
  }

  // ─── Totals helper ──────────────────────────────────────────
  private calcTotals(
    items: { quantity: number; unitPrice: number }[],
    taxRate: number,
    discountAmount: number,
  ) {
    const subtotal = items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitPrice),
      0,
    );
    const taxAmount = Math.round((subtotal * taxRate) / 10000);
    const total = Math.max(0, subtotal + taxAmount - discountAmount);
    return { subtotal, taxAmount, total };
  }

  // ─── List ────────────────────────────────────────────────────
  async findAll(tenantId: string, filters: InvoiceFiltersDto) {
    const { search, status, clientId, dateFrom, dateTo, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions = [eq(invoices.tenantId, tenantId)];
    if (search) {
      conditions.push(
        or(ilike(invoices.number, `%${search}%`), ilike(clients.name, `%${search}%`))!,
      );
    }
    if (status) conditions.push(eq(invoices.status, status));
    if (clientId) conditions.push(eq(invoices.clientId, clientId));
    if (dateFrom) conditions.push(sql`${invoices.issueDate} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${invoices.issueDate} <= ${dateTo}`);

    const where = and(...conditions);

    const [rows, [{ total }], totalsRow] = await Promise.all([
      this.db
        .select({ invoice: invoices, client: { id: clients.id, name: clients.name } })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(where)
        .orderBy(desc(invoices.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id)).where(where),
      this.db
        .select({ totalAmount: sql<number>`coalesce(sum(total), 0)` })
        .from(invoices)
        .where(where),
    ]);

    return {
      data: rows.map(({ invoice, client }) => ({ ...invoice, client })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      totals: { totalAmount: totalsRow[0]?.totalAmount ?? 0 },
    };
  }

  // ─── Get one ─────────────────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const [row] = await this.db
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .limit(1);

    if (!row) throw new NotFoundException('Invoice not found');

    const items = await this.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))
      .orderBy(invoiceItems.sortOrder);

    const invoicePayments = await this.db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id))
      .orderBy(payments.paidAt);

    return { ...row.invoice, client: row.client, items, payments: invoicePayments };
  }

  // ─── Get by share token (public) ────────────────────────────
  async findByShareToken(token: string) {
    const [row] = await this.db
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.shareToken, token))
      .limit(1);

    if (!row) throw new NotFoundException('Invoice not found');

    // Mark viewed if first time
    if (!row.invoice.viewedAt) {
      await this.db
        .update(invoices)
        .set({ viewedAt: new Date() } as any)
        .where(eq(invoices.id, row.invoice.id));
    }

    const items = await this.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, row.invoice.id))
      .orderBy(invoiceItems.sortOrder);

    return { ...row.invoice, client: row.client, items };
  }

  // ─── Create ──────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateInvoiceDto) {
    const { seq, number } = await this.nextNumber(tenantId);
    const { subtotal, taxAmount, total } = this.calcTotals(
      dto.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      dto.taxRate ?? 0,
      dto.discountAmount ?? 0,
    );

    const [invoice] = await this.db
      .insert(invoices)
      .values({
        tenantId,
        clientId: dto.clientId,
        number,
        numberSequence: seq,
        issueDate: dto.issueDate,
        dueDate: dto.dueDate,
        currency: dto.currency ?? 'PKR',
        taxRate: dto.taxRate ?? 0,
        discountAmount: dto.discountAmount ?? 0,
        subtotal,
        taxAmount,
        total,
        notes: dto.notes,
        terms: dto.terms,
        templateId: dto.templateId ?? null,
      } as any)
      .returning();

    if (dto.items.length > 0) {
      await this.db.insert(invoiceItems).values(
        dto.items.map((item, i) => ({
          invoiceId: invoice!.id,
          tenantId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: Math.round(item.quantity * item.unitPrice),
          sortOrder: item.sortOrder ?? i,
        })),
      );
    }

    return this.findOne(tenantId, invoice!.id);
  }

  // ─── Update ──────────────────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateInvoiceDto) {
    const existing = await this.findOne(tenantId, id);
    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be edited');
    }

    const items = dto.items ?? existing.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      sortOrder: i.sortOrder,
    }));

    const { subtotal, taxAmount, total } = this.calcTotals(
      items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      dto.taxRate ?? existing.taxRate,
      dto.discountAmount ?? existing.discountAmount,
    );

    await this.db
      .update(invoices)
      .set({
        clientId: dto.clientId ?? existing.clientId,
        issueDate: dto.issueDate ?? existing.issueDate,
        dueDate: dto.dueDate ?? existing.dueDate,
        currency: dto.currency ?? existing.currency,
        taxRate: dto.taxRate ?? existing.taxRate,
        discountAmount: dto.discountAmount ?? existing.discountAmount,
        subtotal,
        taxAmount,
        total,
        notes: dto.notes ?? existing.notes,
        terms: dto.terms ?? existing.terms,
        templateId: dto.templateId !== undefined ? dto.templateId : existing.templateId,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));

    if (dto.items) {
      await this.db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await this.db.insert(invoiceItems).values(
        dto.items.map((item, i) => ({
          invoiceId: id,
          tenantId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: Math.round(item.quantity * item.unitPrice),
          sortOrder: item.sortOrder ?? i,
        })),
      );
    }

    return this.findOne(tenantId, id);
  }

  // ─── Delete ──────────────────────────────────────────────────
  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);
    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be deleted');
    }
    await this.db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    return { success: true };
  }

  // ─── Duplicate ───────────────────────────────────────────────
  async duplicate(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);
    return this.create(tenantId, {
      clientId: existing.clientId,
      issueDate: new Date().toISOString().split('T')[0]!,
      dueDate: existing.dueDate,
      currency: existing.currency,
      taxRate: existing.taxRate,
      discountAmount: existing.discountAmount,
      notes: existing.notes ?? undefined,
      terms: existing.terms ?? undefined,
      items: existing.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        sortOrder: i.sortOrder,
      })),
    });
  }

  // ─── Send ────────────────────────────────────────────────────
  async send(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);
    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be sent');
    }
    const [updated] = await this.db
      .update(invoices)
      .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() } as any)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    // Enqueue PDF generation
    await this.pdfQueue.add('generate', { type: 'invoice', resourceId: id, tenantId });

    // Enqueue notification email to client
    const client = existing.client;
    if (client?.email) {
      const shareUrl = `${process.env['APP_URL'] ?? 'http://localhost:3000'}/invoice/${existing.shareToken}`;
      await this.emailQueue.add('send', {
        to: client.email,
        subject: `Invoice ${existing.number} from Sterling`,
        html: `<p>Hi ${client.name},</p>
<p>Please find your invoice <strong>${existing.number}</strong> attached.</p>
<p><a href="${shareUrl}" style="background:#3D52A0;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">View Invoice</a></p>
<p>Due date: <strong>${existing.dueDate}</strong></p>
<p>Thank you for your business.</p>`,
      });
    }

    return updated;
  }

  // ─── Record payment ──────────────────────────────────────────
  async recordPayment(tenantId: string, invoiceId: string, dto: RecordPaymentDto) {
    const invoice = await this.findOne(tenantId, invoiceId);
    if (invoice.status === 'draft') {
      throw new BadRequestException('Cannot record payment on a draft invoice');
    }

    const remaining = invoice.total - invoice.amountPaid;
    if (dto.amount > remaining) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remaining})`,
      );
    }

    await this.db.insert(payments).values({
      invoiceId,
      tenantId,
      amount: dto.amount,
      method: dto.method,
      notes: dto.notes,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
    } as any);

    const newAmountPaid = invoice.amountPaid + dto.amount;
    const isPaid = newAmountPaid >= invoice.total;

    await this.db
      .update(invoices)
      .set({
        amountPaid: newAmountPaid,
        status: isPaid ? 'paid' : invoice.status,
        paidAt: isPaid ? new Date() : invoice.paidAt,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    return this.findOne(tenantId, invoiceId);
  }

  // ─── Get PDF URL ─────────────────────────────────────────────
  async getPdfUrl(tenantId: string, id: string) {
    const invoice = await this.findOne(tenantId, id);
    if (!invoice.pdfPath) {
      // Enqueue generation and return job status
      await this.pdfQueue.add('generate', { type: 'invoice', resourceId: id, tenantId });
      return { status: 'generating', url: null };
    }
    return { status: 'ready', pdfPath: invoice.pdfPath };
  }

  // ─── QR code (returns SVG data URL) ─────────────────────────
  async getShareQr(tenantId: string, id: string): Promise<string> {
    const invoice = await this.findOne(tenantId, id);
    const { toDataURL } = await import('qrcode');
    const url = `${process.env['APP_URL'] ?? 'http://localhost:3000'}/invoice/${invoice.shareToken}`;
    return toDataURL(url, { type: 'image/png', width: 256, margin: 1 });
  }

  // ─── Overdue cron (called by BullMQ cron job) ────────────────
  async markOverdueInvoices() {
    const today = new Date().toISOString().split('T')[0]!;
    await this.db
      .update(invoices)
      .set({ status: 'overdue', updatedAt: new Date() } as any)
      .where(
        and(
          eq(invoices.status, 'sent'),
          sql`${invoices.dueDate} < ${today}`,
        ),
      );
  }
}
