import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

export const QUEUE_EMAIL = 'email';
export const QUEUE_PDF = 'pdf';
export const QUEUE_PAYROLL = 'payroll';
export const QUEUE_REMINDERS = 'reminders';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_PDF },
      { name: QUEUE_PAYROLL },
      { name: QUEUE_REMINDERS },
    ),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: QUEUE_EMAIL, adapter: BullMQAdapter },
      { name: QUEUE_PDF, adapter: BullMQAdapter },
      { name: QUEUE_PAYROLL, adapter: BullMQAdapter },
      { name: QUEUE_REMINDERS, adapter: BullMQAdapter },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
