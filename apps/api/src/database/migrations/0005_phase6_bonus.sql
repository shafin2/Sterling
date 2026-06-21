-- Phase 6: Tax Rules
-- Enum
DO $$ BEGIN
  CREATE TYPE tax_applies_to AS ENUM ('invoice', 'payroll', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS tax_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  rate_bps      INTEGER NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  applies_to    tax_applies_to NOT NULL DEFAULT 'invoice',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tax_rules_tenant_idx ON tax_rules (tenant_id);

-- RLS
ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_rules_tenant_isolation ON tax_rules;
CREATE POLICY tax_rules_tenant_isolation ON tax_rules
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
