import { pgEnum, pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const taxAppliesToEnum = pgEnum('tax_applies_to', ['invoice', 'payroll', 'both']);

export const taxRules = pgTable('tax_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  rateBps: integer('rate_bps').notNull(), // basis points: 1500 = 15%
  appliesTo: taxAppliesToEnum('applies_to').notNull().default('invoice'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TaxRule = typeof taxRules.$inferSelect;
export type NewTaxRule = typeof taxRules.$inferInsert;
