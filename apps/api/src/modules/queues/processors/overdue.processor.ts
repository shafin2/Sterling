import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { QUEUE_REMINDERS, QUEUE_EMAIL } from '../queues.module';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { DrizzleDb } from '../../../database/drizzle.types';
import { invoices, clients, auditLogs } from '../../../database/schema';
import { and, eq, sql, gte, lte, isNull } from 'drizzle-orm';

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

  private async markOverdue(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]!;
    await this.db
      .update(invoices)
      .set({ status: 'overdue', updatedAt: new Date() } as any)
      .where(and(eq(invoices.status, 'sent'), sql`${invoices.dueDate} < ${today}`));
    this.logger.log(`Overdue cron ran — today: ${today}`);
  }

  private async sendReminders(): Promise<void> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]!;

    // 3-day pre-due reminder
    const threeDaysOut = new Date(today);
    threeDaysOut.setDate(today.getDate() + 3);
    const threeDaysOutStr = threeDaysOut.toISOString().split('T')[0]!;

    // 7-day overdue reminder
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]!;

    // Pre-due: due in exactly 3 days, still 'sent'
    const preDueInvoices = await this.db
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.status, 'sent'),
          sql`${invoices.dueDate} = ${threeDaysOutStr}`,
        ),
      );

    // Overdue: became overdue exactly 7 days ago (status=overdue, dueDate=7 days ago)
    const overdueInvoices = await this.db
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.status, 'overdue'),
          sql`${invoices.dueDate} = ${sevenDaysAgoStr}`,
        ),
      );

    const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000';

    for (const { invoice, client } of preDueInvoices) {
      if (!client?.email) continue;
      const shareUrl = `${appUrl}/invoice/${invoice.shareToken}`;
      await this.emailQueue.add('send', {
        to: client.email,
        subject: `Reminder: Invoice ${invoice.number} is due in 3 days`,
        html: `<p>Hi ${client.name},</p>
<p>This is a friendly reminder that invoice <strong>${invoice.number}</strong> is due on <strong>${invoice.dueDate}</strong>.</p>
<p><a href="${shareUrl}" style="background:#3D52A0;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">View Invoice</a></p>
<p>Thank you for your business.</p>`,
      });
      this.logger.log(`Sent pre-due reminder for invoice ${invoice.number} to ${client.email}`);
    }

    for (const { invoice, client } of overdueInvoices) {
      if (!client?.email) continue;
      const shareUrl = `${appUrl}/invoice/${invoice.shareToken}`;
      await this.emailQueue.add('send', {
        to: client.email,
        subject: `Overdue: Invoice ${invoice.number} is 7 days past due`,
        html: `<p>Hi ${client.name},</p>
<p>Invoice <strong>${invoice.number}</strong> was due on <strong>${invoice.dueDate}</strong> and remains unpaid.</p>
<p>Please arrange payment at your earliest convenience.</p>
<p><a href="${shareUrl}" style="background:#C9485B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">View & Pay Invoice</a></p>`,
      });
      this.logger.log(`Sent overdue reminder for invoice ${invoice.number} to ${client.email}`);
    }
  }
}
