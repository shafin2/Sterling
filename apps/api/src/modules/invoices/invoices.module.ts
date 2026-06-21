import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PublicInvoiceController } from './public-invoice.controller';
import { AiInvoiceService } from './ai-invoice.service';
import { QUEUE_PDF, QUEUE_EMAIL } from '../queues/queues.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_PDF }),
    BullModule.registerQueue({ name: QUEUE_EMAIL }),
  ],
  controllers: [InvoicesController, PublicInvoiceController],
  providers: [InvoicesService, AiInvoiceService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
