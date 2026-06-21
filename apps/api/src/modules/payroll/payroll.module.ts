import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { QUEUE_PAYROLL, QUEUE_PDF, QUEUE_EMAIL } from '../queues/queues.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_PAYROLL },
      { name: QUEUE_PDF },
      { name: QUEUE_EMAIL },
    ),
    StorageModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
