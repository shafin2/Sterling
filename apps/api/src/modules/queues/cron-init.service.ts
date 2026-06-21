import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_REMINDERS } from './queues.module';

@Injectable()
export class CronInitService implements OnModuleInit {
  private readonly logger = new Logger(CronInitService.name);

  constructor(
    @InjectQueue(QUEUE_REMINDERS) private readonly remindersQueue: Queue,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.registerOverdueCron(),
      this.registerReminderCron(),
    ]);
  }

  /**
   * Midnight cron (00:05 UTC) — flips sent→overdue and also dispatches
   * overdue-notice reminder emails for already-overdue invoices.
   */
  private async registerOverdueCron(): Promise<void> {
    try {
      await this.remindersQueue.upsertJobScheduler(
        'daily-overdue-check',
        { pattern: '5 0 * * *' },
        { name: 'check-overdue', data: {} },
      );
      this.logger.log('Overdue-check cron registered (00:05 UTC daily)');
    } catch (err) {
      this.logger.error('Failed to register overdue-check cron', err);
    }
  }

  /**
   * Morning cron (09:00 UTC) — sends pre-due (3-day) and due-today reminder
   * emails so clients receive them at a reasonable hour, separate from the
   * midnight status-flip cron. The 23-hour cooldown in the processor prevents
   * double-sending if both crons happen to trigger on the same invoice.
   */
  private async registerReminderCron(): Promise<void> {
    try {
      await this.remindersQueue.upsertJobScheduler(
        'daily-payment-reminders',
        { pattern: '0 9 * * *' },
        { name: 'check-overdue', data: {} },
      );
      this.logger.log('Payment-reminder cron registered (09:00 UTC daily)');
    } catch (err) {
      this.logger.error('Failed to register payment-reminder cron', err);
    }
  }
}
