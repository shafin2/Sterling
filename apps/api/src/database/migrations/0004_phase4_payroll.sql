-- Phase 4: Payroll & Salary Slips

-- Enums
CREATE TYPE "payroll_run_status" AS ENUM ('draft', 'processing', 'completed', 'paid');
CREATE TYPE "payslip_status"     AS ENUM ('draft', 'processed', 'paid');

-- Payroll runs (one per period per tenant)
CREATE TABLE "payroll_runs" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "period_month"     integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  "period_year"      integer NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  "status"           payroll_run_status NOT NULL DEFAULT 'draft',
  "total_gross"      integer NOT NULL DEFAULT 0,
  "total_deductions" integer NOT NULL DEFAULT 0,
  "total_net"        integer NOT NULL DEFAULT 0,
  "employee_count"   integer NOT NULL DEFAULT 0,
  "notes"            text,
  "processed_at"     timestamptz,
  "paid_at"          timestamptz,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

-- Payslips (one per employee per run)
CREATE TABLE "payslips" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"              uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "payroll_run_id"         uuid NOT NULL REFERENCES "payroll_runs"("id") ON DELETE CASCADE,
  "employee_id"            uuid NOT NULL REFERENCES "employees"("id"),
  "salary_structure_id"    uuid REFERENCES "salary_structures"("id") ON DELETE SET NULL,
  -- Snapshot of salary structure at time of run creation
  "basic_salary"           integer NOT NULL DEFAULT 0,
  "allowances"             jsonb NOT NULL DEFAULT '[]',
  "deductions"             jsonb NOT NULL DEFAULT '[]',
  -- Per-run adjustments (editable while run is draft)
  "bonus_amount"           integer NOT NULL DEFAULT 0,
  "unpaid_leave_days"      integer NOT NULL DEFAULT 0,
  "unpaid_leave_deduction" integer NOT NULL DEFAULT 0,
  "adjustments"            jsonb NOT NULL DEFAULT '[]',
  -- Computed values (recalculated on each adjustment edit and on process)
  "gross_salary"           integer NOT NULL DEFAULT 0,
  "total_deductions"       integer NOT NULL DEFAULT 0,
  "tax_amount"             integer NOT NULL DEFAULT 0,
  "net_salary"             integer NOT NULL DEFAULT 0,
  -- State
  "status"                 payslip_status NOT NULL DEFAULT 'draft',
  "pdf_path"               text,
  "created_at"             timestamptz NOT NULL DEFAULT now(),
  "updated_at"             timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX "payroll_runs_tenant_id_idx"      ON "payroll_runs"("tenant_id");
CREATE INDEX "payroll_runs_status_idx"         ON "payroll_runs"("status");
CREATE UNIQUE INDEX "payroll_runs_period_idx"  ON "payroll_runs"("tenant_id", "period_year", "period_month");
CREATE INDEX "payslips_tenant_id_idx"          ON "payslips"("tenant_id");
CREATE INDEX "payslips_run_id_idx"             ON "payslips"("payroll_run_id");
CREATE INDEX "payslips_employee_id_idx"        ON "payslips"("employee_id");

-- Row-Level Security
ALTER TABLE "payroll_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payslips"     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_payroll_runs"
  ON "payroll_runs" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "tenant_isolation_payslips"
  ON "payslips" USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid);
