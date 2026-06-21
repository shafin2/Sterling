-- Phase 1: Clients, Departments, Employees, Salary Structures

-- Enums
CREATE TYPE "client_type" AS ENUM ('company', 'person');
CREATE TYPE "client_status" AS ENUM ('active', 'inactive');
CREATE TYPE "employee_status" AS ENUM ('active', 'inactive', 'terminated');

-- Clients
CREATE TABLE "clients" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"           uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "type"                client_type NOT NULL DEFAULT 'company',
  "name"                varchar(255) NOT NULL,
  "email"               varchar(255),
  "phone"               varchar(50),
  "website"             varchar(255),
  "tax_id"              varchar(100),
  "currency"            varchar(10) NOT NULL DEFAULT 'PKR',
  "billing_address"     text,
  "billing_city"        varchar(100),
  "billing_state"       varchar(100),
  "billing_country"     varchar(100) DEFAULT 'Pakistan',
  "billing_postal_code" varchar(20),
  "notes"               text,
  "status"              client_status NOT NULL DEFAULT 'active',
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now(),
  "deleted_at"          timestamptz
);

-- Departments
CREATE TABLE "departments" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name"        varchar(255) NOT NULL,
  "description" text,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

-- Employees
CREATE TABLE "employees" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "code"          varchar(50) NOT NULL,
  "first_name"    varchar(100) NOT NULL,
  "last_name"     varchar(100) NOT NULL,
  "email"         varchar(255),
  "phone"         varchar(50),
  "avatar"        text,
  "department_id" uuid REFERENCES "departments"("id") ON DELETE SET NULL,
  "job_title"     varchar(150),
  "join_date"     date NOT NULL,
  "status"        employee_status NOT NULL DEFAULT 'active',
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now(),
  "deleted_at"    timestamptz
);

-- Salary Structures (effective-dated, history kept)
CREATE TABLE "salary_structures" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"      uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "employee_id"    uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "effective_date" date NOT NULL,
  "basic_salary"   integer NOT NULL,  -- minor units (paisa)
  "allowances"     jsonb NOT NULL DEFAULT '[]',
  "deductions"     jsonb NOT NULL DEFAULT '[]',
  "is_current"     boolean NOT NULL DEFAULT false,
  "created_at"     timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX "clients_tenant_id_idx" ON "clients"("tenant_id");
CREATE INDEX "clients_status_idx" ON "clients"("status");
CREATE INDEX "clients_deleted_at_idx" ON "clients"("deleted_at");
CREATE INDEX "departments_tenant_id_idx" ON "departments"("tenant_id");
CREATE INDEX "employees_tenant_id_idx" ON "employees"("tenant_id");
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");
CREATE INDEX "employees_status_idx" ON "employees"("status");
CREATE INDEX "employees_deleted_at_idx" ON "employees"("deleted_at");
CREATE UNIQUE INDEX "employees_tenant_code_idx" ON "employees"("tenant_id", "code") WHERE "deleted_at" IS NULL;
CREATE INDEX "salary_structures_employee_id_idx" ON "salary_structures"("employee_id");
CREATE INDEX "salary_structures_is_current_idx" ON "salary_structures"("is_current");

-- RLS
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "salary_structures" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_clients"
  ON "clients" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_departments"
  ON "departments" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_employees"
  ON "employees" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_salary_structures"
  ON "salary_structures" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);
