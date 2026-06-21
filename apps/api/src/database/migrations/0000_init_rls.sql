-- ─── Multi-tenancy: enable RLS on all domain tables ────────────────────────

-- tenants table (no RLS — accessed by super admin only via service role)
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "slug" varchar(50) NOT NULL UNIQUE,
  "logo" text,
  "website" varchar(255),
  "phone" varchar(30),
  "address" text,
  "city" varchar(100),
  "country" varchar(100) DEFAULT 'Pakistan',
  "currency" varchar(10) NOT NULL DEFAULT 'PKR',
  "tax_id" varchar(50),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- users (global, no tenant_id — membership links them)
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "first_name" varchar(50) NOT NULL,
  "last_name" varchar(50) NOT NULL,
  "avatar" text,
  "is_email_verified" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "password_reset_token" text,
  "password_reset_expires_at" timestamptz,
  "last_login_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- memberships (user ↔ tenant, with role)
CREATE TABLE IF NOT EXISTS "memberships" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "role" varchar(20) NOT NULL DEFAULT 'viewer',
  "is_active" boolean NOT NULL DEFAULT true,
  "invited_by" uuid REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "tenant_id")
);

-- audit_logs (tenant-scoped)
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" varchar(100) NOT NULL,
  "resource" varchar(100) NOT NULL,
  "resource_id" uuid,
  "metadata" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ─── Row-Level Security on tenant-scoped tables ──────────────────────────────
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Policy: tenant can only see its own rows
CREATE POLICY "tenant_isolation_audit_logs"
  ON "audit_logs"
  USING (
    "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

-- ─── Helper: refresh updated_at automatically ────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON "tenants"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON "memberships"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
