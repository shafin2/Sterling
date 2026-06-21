-- Phase 3: Invoice Templates

-- ─── invoice_templates ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  layout      JSONB NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON invoice_templates
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX invoice_templates_tenant_idx ON invoice_templates(tenant_id);

-- Only one default per tenant (partial unique index)
CREATE UNIQUE INDEX invoice_templates_default_idx
  ON invoice_templates(tenant_id)
  WHERE is_default = true;

-- ─── Add template reference to invoices ───────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;
