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
    try {
      // Upsert a daily cron — runs at 00:05 UTC every day
      await this.remindersQueue.upsertJobScheduler(
        'daily-overdue-check',
        { pattern: '5 0 * * *' },
        { name: 'check-overdue', data: {} },
      );
      this.logger.log('Daily overdue check cron registered (00:05 UTC)');
    } catch (err) {
      this.logger.error('Failed to register overdue cron', err);
    }
  }
}
