import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const clientTypeEnum = pgEnum('client_type', ['company', 'person']);
export const clientStatusEnum = pgEnum('client_status', ['active', 'inactive']);

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  type: clientTypeEnum('type').notNull().default('company'),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  taxId: varchar('tax_id', { length: 100 }),
  currency: varchar('currency', { length: 10 }).notNull().default('PKR'),
  billingAddress: text('billing_address'),
  billingCity: varchar('billing_city', { length: 100 }),
  billingState: varchar('billing_state', { length: 100 }),
  billingCountry: varchar('billing_country', { length: 100 }).default('Pakistan'),
  billingPostalCode: varchar('billing_postal_code', { length: 20 }),
  notes: text('notes'),
  status: clientStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
