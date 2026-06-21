import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import {
  payrollRuns, payslips, employees, salaryStructures, departments,
} from '../../database/schema';
import { and, eq, desc, count, sql } from 'drizzle-orm';
import { QUEUE_PAYROLL, QUEUE_PDF } from '../queues/queues.module';
import { StorageService } from '../storage/storage.service';
import type {
  CreatePayrollRunDto,
  UpdatePayslipDto,
  PayrollFiltersDto,
  PayrollAdjustment,
} from '@sterling/shared';
import type { SalaryComponent } from '../../database/schema';

// ─── Computation engine ─────────────────────────────────────────────────────

interface ComputeInput {
  basicSalary: number;
  allowances: SalaryComponent[];
  deductions: SalaryComponent[];
  bonusAmount: number;
  unpaidLeaveDays: number;
  adjustments: PayrollAdjustment[];
}

interface ComputeResult {
  unpaidLeaveDeduction: number;
  grossSalary: number;
  totalDeductions: number;
  taxAmount: number;
  netSalary: number;
}

function computePayslip(input: ComputeInput): ComputeResult {
  const allowancesTotal = (input.allowances as SalaryComponent[]).reduce(
    (s, a) => s + a.amount,
    0,
  );
  const structureDeductions = (input.deductions as SalaryComponent[]).reduce(
    (s, d) => s + d.amount,
    0,
  );
  const additionAdjustments = input.adjustments
    .filter((a) => a.type === 'addition')
    .reduce((s, a) => s + a.amount, 0);
  const deductionAdjustments = input.adjustments
    .filter((a) => a.type === 'deduction')
    .reduce((s, a) => s + a.amount, 0);

  const unpaidLeaveDeduction =
    input.unpaidLeaveDays > 0
      ? Math.round((input.basicSalary / 30) * input.unpaidLeaveDays)
      : 0;

  const grossSalary = input.basicSalary + allowancesTotal + input.bonusAmount + additionAdjustments;
  const totalDeductions = structureDeductions + deductionAdjustments + unpaidLeaveDeduction;
  const taxAmount = 0; // Phase 6: pluggable tax rules
  const netSalary = Math.max(0, grossSalary - totalDeductions - taxAmount);

  return { unpaidLeaveDeduction, grossSalary, totalDeductions, taxAmount, netSalary };
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class PayrollService {
  constructor(
    @InjectDrizzle() private readonly db: DrizzleDb,
    @InjectQueue(QUEUE_PAYROLL) private readonly payrollQueue: Queue,
    @InjectQueue(QUEUE_PDF) private readonly pdfQueue: Queue,
    private readonly storage: StorageService,
  ) {}

  // ─── Create run ──────────────────────────────────────────────
  async createRun(tenantId: string, dto: CreatePayrollRunDto) {
    // Check for duplicate period
    const [existing] = await this.db
      .select({ id: payrollRuns.id })
      .from(payrollRuns)
      .where(
        and(
          eq(payrollRuns.tenantId, tenantId),
          eq(payrollRuns.periodYear, dto.periodYear),
          eq(payrollRuns.periodMonth, dto.periodMonth),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(
        `A payroll run already exists for ${dto.periodYear}-${String(dto.periodMonth).padStart(2, '0')}`,
      );
    }

    // Get all active employees with their current salary structure
    const activeEmployees = await this.db
      .select({ employee: employees, structure: salaryStructures })
      .from(employees)
      .leftJoin(
        salaryStructures,
        and(
          eq(salaryStructures.employeeId, employees.id),
          eq(salaryStructures.tenantId, tenantId),
          eq(salaryStructures.isCurrent, true),
        ),
      )
      .where(
        and(eq(employees.tenantId, tenantId), eq(employees.status, 'active')),
      );

    if (activeEmployees.length === 0) {
      throw new BadRequestException('No active employees found for this tenant');
    }

    // Create the run
    const [run] = await this.db
      .insert(payrollRuns)
      .values({
        tenantId,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        notes: dto.notes,
        employeeCount: activeEmployees.length,
      } as any)
      .returning();

    // Create draft payslips with initial computation
    const slipValues = activeEmployees.map(({ employee, structure }) => {
      const basic = structure?.basicSalary ?? 0;
      const allowances = (structure?.allowances ?? []) as SalaryComponent[];
      const deductions = (structure?.deductions ?? []) as SalaryComponent[];

      const computed = computePayslip({
        basicSalary: basic,
        allowances,
        deductions,
        bonusAmount: 0,
        unpaidLeaveDays: 0,
        adjustments: [],
      });

      return {
        tenantId,
        payrollRunId: run!.id,
        employeeId: employee.id,
        salaryStructureId: structure?.id ?? null,
        basicSalary: basic,
        allowances,
        deductions,
        bonusAmount: 0,
        unpaidLeaveDays: 0,
        ...computed,
      };
    });

    if (slipValues.length > 0) {
      await this.db.insert(payslips).values(slipValues as any);
    }

    // Update run totals
    await this.recomputeRunTotals(run!.id, tenantId);

    return this.findOne(tenantId, run!.id);
  }

  // ─── List runs ───────────────────────────────────────────────
  async findAll(tenantId: string, filters: PayrollFiltersDto) {
    const { status, year, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions = [eq(payrollRuns.tenantId, tenantId)];
    if (status) conditions.push(eq(payrollRuns.status, status));
    if (year) conditions.push(eq(payrollRuns.periodYear, year));

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(payrollRuns)
        .where(where)
        .orderBy(desc(payrollRuns.periodYear), desc(payrollRuns.periodMonth))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(payrollRuns).where(where),
    ]);

    return {
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Get one run (with payslips) ─────────────────────────────
  async findOne(tenantId: string, id: string) {
    const [run] = await this.db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.id, id), eq(payrollRuns.tenantId, tenantId)))
      .limit(1);

    if (!run) throw new NotFoundException('Payroll run not found');

    const slips = await this.db
      .select({
        payslip: payslips,
        employee: {
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          code: employees.code,
          jobTitle: employees.jobTitle,
          departmentId: employees.departmentId,
        },
      })
      .from(payslips)
      .leftJoin(employees, eq(payslips.employeeId, employees.id))
      .where(and(eq(payslips.payrollRunId, id), eq(payslips.tenantId, tenantId)))
      .orderBy(employees.firstName);

    return {
      ...run,
      payslips: slips.map(({ payslip, employee }) => ({ ...payslip, employee })),
    };
  }

  // ─── Update payslip adjustments ──────────────────────────────
  async updatePayslip(tenantId: string, runId: string, slipId: string, dto: UpdatePayslipDto) {
    const run = await this.getRun(tenantId, runId);
    if (run.status !== 'draft') {
      throw new BadRequestException('Adjustments can only be edited on draft runs');
    }

    const [slip] = await this.db
      .select()
      .from(payslips)
      .where(
        and(
          eq(payslips.id, slipId),
          eq(payslips.payrollRunId, runId),
          eq(payslips.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!slip) throw new NotFoundException('Payslip not found');

    const computed = computePayslip({
      basicSalary: slip.basicSalary,
      allowances: (slip.allowances as SalaryComponent[]),
      deductions: (slip.deductions as SalaryComponent[]),
      bonusAmount: dto.bonusAmount,
      unpaidLeaveDays: dto.unpaidLeaveDays,
      adjustments: dto.adjustments as PayrollAdjustment[],
    });

    await this.db
      .update(payslips)
      .set({
        bonusAmount: dto.bonusAmount,
        unpaidLeaveDays: dto.unpaidLeaveDays,
        adjustments: dto.adjustments,
        ...computed,
        updatedAt: new Date(),
      } as any)
      .where(eq(payslips.id, slipId));

    await this.recomputeRunTotals(runId, tenantId);

    return this.findOne(tenantId, runId);
  }

  // ─── Trigger processing job ──────────────────────────────────
  async processRun(tenantId: string, id: string) {
    const run = await this.getRun(tenantId, id);
    if (run.status !== 'draft') {
      throw new BadRequestException('Only draft runs can be processed');
    }

    // Set to processing immediately so UI reflects it
    await this.db
      .update(payrollRuns)
      .set({ status: 'processing', updatedAt: new Date() } as any)
      .where(eq(payrollRuns.id, id));

    await this.payrollQueue.add('process-run', { runId: id, tenantId }, { attempts: 3 });

    return this.findOne(tenantId, id);
  }

  // ─── Mark run as paid ────────────────────────────────────────
  async markPaid(tenantId: string, id: string) {
    const run = await this.getRun(tenantId, id);
    if (run.status !== 'completed') {
      throw new BadRequestException('Only completed runs can be marked as paid');
    }

    await this.db
      .update(payrollRuns)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() } as any)
      .where(eq(payrollRuns.id, id));

    // Mark all payslips as paid
    await this.db
      .update(payslips)
      .set({ status: 'paid', updatedAt: new Date() } as any)
      .where(eq(payslips.payrollRunId, id));

    return this.findOne(tenantId, id);
  }

  // ─── Delete run (draft only) ─────────────────────────────────
  async removeRun(tenantId: string, id: string) {
    const run = await this.getRun(tenantId, id);
    if (run.status !== 'draft') {
      throw new BadRequestException('Only draft runs can be deleted');
    }
    await this.db
      .delete(payrollRuns)
      .where(and(eq(payrollRuns.id, id), eq(payrollRuns.tenantId, tenantId)));
    return { success: true };
  }

  // ─── Get payslip PDF ─────────────────────────────────────────
  async getPayslipPdf(tenantId: string, runId: string, slipId: string) {
    await this.getRun(tenantId, runId);
    const [slip] = await this.db
      .select()
      .from(payslips)
      .where(and(eq(payslips.id, slipId), eq(payslips.payrollRunId, runId), eq(payslips.tenantId, tenantId)))
      .limit(1);

    if (!slip) throw new NotFoundException('Payslip not found');

    if (!slip.pdfPath) {
      await this.pdfQueue.add('generate', { type: 'payslip', resourceId: slipId, tenantId });
      return { status: 'generating', url: null };
    }
    const url = await this.storage.getPresignedUrl(slip.pdfPath);
    return { status: 'ready', url };
  }

  // ─── Called by BullMQ payroll processor ─────────────────────
  async finalizeRun(runId: string, tenantId: string) {
    const slips = await this.db
      .select()
      .from(payslips)
      .where(and(eq(payslips.payrollRunId, runId), eq(payslips.tenantId, tenantId)));

    // Recompute all payslips and lock them
    for (const slip of slips) {
      const computed = computePayslip({
        basicSalary: slip.basicSalary,
        allowances: (slip.allowances as SalaryComponent[]),
        deductions: (slip.deductions as SalaryComponent[]),
        bonusAmount: slip.bonusAmount,
        unpaidLeaveDays: slip.unpaidLeaveDays,
        adjustments: (slip.adjustments as PayrollAdjustment[]),
      });

      await this.db
        .update(payslips)
        .set({ ...computed, status: 'processed', updatedAt: new Date() } as any)
        .where(eq(payslips.id, slip.id));
    }

    await this.recomputeRunTotals(runId, tenantId);

    await this.db
      .update(payrollRuns)
      .set({ status: 'completed', processedAt: new Date(), updatedAt: new Date() } as any)
      .where(eq(payrollRuns.id, runId));
  }

  // ─── Private helpers ─────────────────────────────────────────
  private async getRun(tenantId: string, id: string) {
    const [run] = await this.db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.id, id), eq(payrollRuns.tenantId, tenantId)))
      .limit(1);
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  private async recomputeRunTotals(runId: string, tenantId: string) {
    const [totals] = await this.db
      .select({
        totalGross: sql<string>`coalesce(sum(gross_salary), 0)`,
        totalDeductions: sql<string>`coalesce(sum(total_deductions), 0)`,
        totalNet: sql<string>`coalesce(sum(net_salary), 0)`,
        employeeCount: count(),
      })
      .from(payslips)
      .where(and(eq(payslips.payrollRunId, runId), eq(payslips.tenantId, tenantId)));

    await this.db
      .update(payrollRuns)
      .set({
        totalGross: Number(totals?.totalGross ?? 0),
        totalDeductions: Number(totals?.totalDeductions ?? 0),
        totalNet: Number(totals?.totalNet ?? 0),
        employeeCount: totals?.employeeCount ?? 0,
        updatedAt: new Date(),
      } as any)
      .where(eq(payrollRuns.id, runId));
  }
}
