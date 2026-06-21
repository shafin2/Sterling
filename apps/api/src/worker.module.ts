import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './modules/storage/storage.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { EmailProcessor } from './modules/queues/processors/email.processor';
import { PdfProcessor } from './modules/queues/processors/pdf.processor';
import { OverdueProcessor } from './modules/queues/processors/overdue.processor';
import { PayrollProcessor } from './modules/queues/processors/payroll.processor';
import { CronInitService } from './modules/queues/cron-init.service';
import envConfig from './config/env.config';
import { QUEUE_EMAIL, QUEUE_PDF, QUEUE_PAYROLL, QUEUE_REMINDERS } from './modules/queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['../../.env', '.env'], isGlobal: true, load: [envConfig], cache: true }),
    LoggerModule.forRoot({ pinoHttp: { level: 'info' } as any }),
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
    DatabaseModule,
    StorageModule,
    PayrollModule,
  ],
  providers: [EmailProcessor, PdfProcessor, OverdueProcessor, PayrollProcessor, CronInitService],
})
export class WorkerModule {}
