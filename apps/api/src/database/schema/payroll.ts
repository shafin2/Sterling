import { pgTable, uuid, integer, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { employees } from './employees';
import { salaryStructures } from './salary-structures';

export const payrollRunStatusEnum = pgEnum('payroll_run_status', ['draft', 'processing', 'completed', 'paid']);
export const payslipStatusEnum = pgEnum('payslip_status', ['draft', 'processed', 'paid']);

export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  periodMonth: integer('period_month').notNull(), // 1-12
  periodYear: integer('period_year').notNull(),
  status: payrollRunStatusEnum('status').notNull().default('draft'),
  totalGross: integer('total_gross').notNull().default(0),
  totalDeductions: integer('total_deductions').notNull().default(0),
  totalNet: integer('total_net').notNull().default(0),
  employeeCount: integer('employee_count').notNull().default(0),
  notes: text('notes'),
  processedAt: timestamp('processed_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;

export const payslips = pgTable('payslips', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  salaryStructureId: uuid('salary_structure_id').references(() => salaryStructures.id, { onDelete: 'set null' }),
  // Snapshots from salary structure (immutable after processing)
  basicSalary: integer('basic_salary').notNull().default(0),
  allowances: jsonb('allowances').notNull().default([]), // SalaryComponent[]
  deductions: jsonb('deductions').notNull().default([]), // SalaryComponent[]
  // Per-run adjustments (editable while draft)
  bonusAmount: integer('bonus_amount').notNull().default(0),
  unpaidLeaveDays: integer('unpaid_leave_days').notNull().default(0),
  unpaidLeaveDeduction: integer('unpaid_leave_deduction').notNull().default(0),
  adjustments: jsonb('adjustments').notNull().default([]), // { name, amount, type: 'addition'|'deduction' }[]
  // Computed (set on draft create & recomputed on each adjustment edit)
  grossSalary: integer('gross_salary').notNull().default(0),
  totalDeductions: integer('total_deductions').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  netSalary: integer('net_salary').notNull().default(0),
  // Status
  status: payslipStatusEnum('status').notNull().default('draft'),
  pdfPath: text('pdf_path'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Payslip = typeof payslips.$inferSelect;
export type NewPayslip = typeof payslips.$inferInsert;
