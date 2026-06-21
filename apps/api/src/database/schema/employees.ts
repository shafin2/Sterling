import { pgTable, uuid, varchar, text, boolean, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { departments } from './departments';

export const employeeStatusEnum = pgEnum('employee_status', ['active', 'inactive', 'terminated']);

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  avatar: text('avatar'),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  jobTitle: varchar('job_title', { length: 150 }),
  joinDate: date('join_date').notNull(),
  status: employeeStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
