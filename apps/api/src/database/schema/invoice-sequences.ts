import { pgTable, uuid, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const invoiceSequences = pgTable('invoice_sequences', {
  tenantId: uuid('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  lastNumber: integer('last_number').notNull().default(0),
});

export type InvoiceSequence = typeof invoiceSequences.$inferSelect;
