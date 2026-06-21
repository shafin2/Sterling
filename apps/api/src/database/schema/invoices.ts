import { pgTable, uuid, varchar, text, integer, boolean, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clients } from './clients';
import { invoiceTemplates } from './invoice-templates';

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue']);

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  number: varchar('number', { length: 50 }).notNull(),          // e.g. INV-0001
  numberSequence: integer('number_sequence').notNull(),          // numeric ordering
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('PKR'),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  subtotal: integer('subtotal').notNull().default(0),            // minor units
  taxRate: integer('tax_rate').notNull().default(0),             // basis points (1700 = 17%)
  taxAmount: integer('tax_amount').notNull().default(0),         // minor units
  discountAmount: integer('discount_amount').notNull().default(0), // minor units
  total: integer('total').notNull().default(0),                  // minor units
  amountPaid: integer('amount_paid').notNull().default(0),       // minor units
  notes: text('notes'),
  terms: text('terms'),
  shareToken: uuid('share_token').notNull().defaultRandom(),
  templateId: uuid('template_id').references(() => invoiceTemplates.id, { onDelete: 'set null' }),
  pdfPath: text('pdf_path'),                                     // MinIO object path
  viewedAt: timestamp('viewed_at'),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
