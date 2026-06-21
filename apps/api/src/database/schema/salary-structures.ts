import { pgTable, uuid, integer, boolean, timestamp, date, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { employees } from './employees';

export const salaryStructures = pgTable('salary_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  effectiveDate: date('effective_date').notNull(),
  basicSalary: integer('basic_salary').notNull(), // integer minor units (paisa)
  // [{ name: string, amount: number (minor units) }]
  allowances: jsonb('allowances').notNull().default([]),
  // [{ name: string, amount: number (minor units) }]
  deductions: jsonb('deductions').notNull().default([]),
  isCurrent: boolean('is_current').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type NewSalaryStructure = typeof salaryStructures.$inferInsert;

export type SalaryComponent = { name: string; amount: number };
