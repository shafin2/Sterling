CREATE TABLE IF NOT EXISTS "invites" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(50) NOT NULL DEFAULT 'viewer',
  "token" UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  "invited_by" UUID NOT NULL REFERENCES "users"("id"),
  "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  "accepted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "invites_tenant_id_idx" ON "invites"("tenant_id");
CREATE INDEX IF NOT EXISTS "invites_token_idx" ON "invites"("token");
