-- Phase 2: Invoice Management

-- Enums
CREATE TYPE "invoice_status"  AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE "payment_method"  AS ENUM ('cash', 'bank_transfer', 'cheque', 'online', 'other');

-- Per-tenant invoice number sequence
CREATE TABLE "invoice_sequences" (
  "tenant_id"   uuid PRIMARY KEY REFERENCES "tenants"("id") ON DELETE CASCADE,
  "last_number" integer NOT NULL DEFAULT 0
);

-- Invoices
CREATE TABLE "invoices" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "client_id"       uuid NOT NULL REFERENCES "clients"("id"),
  "number"          varchar(50) NOT NULL,
  "number_sequence" integer NOT NULL,
  "issue_date"      date NOT NULL,
  "due_date"        date NOT NULL,
  "currency"        varchar(10) NOT NULL DEFAULT 'PKR',
  "status"          invoice_status NOT NULL DEFAULT 'draft',
  "subtotal"        integer NOT NULL DEFAULT 0,
  "tax_rate"        integer NOT NULL DEFAULT 0,  -- basis points (1700 = 17%)
  "tax_amount"      integer NOT NULL DEFAULT 0,
  "discount_amount" integer NOT NULL DEFAULT 0,
  "total"           integer NOT NULL DEFAULT 0,
  "amount_paid"     integer NOT NULL DEFAULT 0,
  "notes"           text,
  "terms"           text,
  "share_token"     uuid NOT NULL DEFAULT gen_random_uuid(),
  "pdf_path"        text,
  "viewed_at"       timestamptz,
  "sent_at"         timestamptz,
  "paid_at"         timestamptz,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);

-- Invoice line items
CREATE TABLE "invoice_items" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id"  uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "tenant_id"   uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "quantity"    real NOT NULL DEFAULT 1,
  "unit_price"  integer NOT NULL DEFAULT 0,
  "amount"      integer NOT NULL DEFAULT 0,
  "sort_order"  integer NOT NULL DEFAULT 0,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

-- Payments (partial payment support)
CREATE TABLE "payments" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "tenant_id"  uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "amount"     integer NOT NULL,
  "method"     payment_method NOT NULL DEFAULT 'bank_transfer',
  "notes"      text,
  "paid_at"    timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX "invoices_tenant_id_idx"       ON "invoices"("tenant_id");
CREATE INDEX "invoices_client_id_idx"       ON "invoices"("client_id");
CREATE INDEX "invoices_status_idx"          ON "invoices"("status");
CREATE INDEX "invoices_due_date_idx"        ON "invoices"("due_date");
CREATE UNIQUE INDEX "invoices_tenant_number_idx" ON "invoices"("tenant_id", "number");
CREATE UNIQUE INDEX "invoices_share_token_idx"   ON "invoices"("share_token");
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");
CREATE INDEX "payments_invoice_id_idx"      ON "payments"("invoice_id");

-- RLS
ALTER TABLE "invoices"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_items"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_sequences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_invoices"
  ON "invoices" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_invoice_items"
  ON "invoice_items" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_payments"
  ON "payments" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_invoice_sequences"
  ON "invoice_sequences" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);
