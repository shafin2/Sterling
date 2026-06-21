import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_PAYROLL } from '../queues.module';
import { PayrollService } from '../../payroll/payroll.service';

export interface PayrollJob {
  runId: string;
  tenantId: string;
}

@Injectable()
@Processor(QUEUE_PAYROLL)
export class PayrollProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(private readonly payrollService: PayrollService) {
    super();
  }

  async process(job: Job<PayrollJob>): Promise<void> {
    const { runId, tenantId } = job.data;
    this.logger.log(`Processing payroll run ${runId} for tenant ${tenantId}`);
    try {
      await this.payrollService.finalizeRun(runId, tenantId);
      this.logger.log(`Payroll run ${runId} completed`);
    } catch (err) {
      this.logger.error(`Payroll run ${runId} failed`, err);
      throw err;
    }
  }
}
