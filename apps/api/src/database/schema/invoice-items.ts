import { pgTable, uuid, text, integer, real, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { invoices } from './invoices';

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),    // allows decimals (e.g. 1.5 hours)
  unitPrice: integer('unit_price').notNull().default(0), // minor units
  amount: integer('amount').notNull().default(0),     // minor units = round(qty * unitPrice)
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
