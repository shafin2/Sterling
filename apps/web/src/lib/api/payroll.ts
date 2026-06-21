import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PayrollRunStatus = 'draft' | 'processing' | 'completed' | 'paid';
export type PayslipStatus = 'draft' | 'processed' | 'paid';

export interface PayrollAdjustment {
  name: string;
  amount: number;
  type: 'addition' | 'deduction';
}

export interface SalaryComponent {
  name: string;
  amount: number;
}

export interface PayslipEmployee {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  jobTitle: string | null;
  departmentId: string | null;
}

export interface Payslip {
  id: string;
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  salaryStructureId: string | null;
  basicSalary: number;
  allowances: SalaryComponent[];
  deductions: SalaryComponent[];
  bonusAmount: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  adjustments: PayrollAdjustment[];
  grossSalary: number;
  totalDeductions: number;
  taxAmount: number;
  netSalary: number;
  status: PayslipStatus;
  pdfPath: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: PayslipEmployee | null;
}

export interface PayrollRun {
  id: string;
  tenantId: string;
  periodMonth: number;
  periodYear: number;
  status: PayrollRunStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  notes: string | null;
  processedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunDetail extends PayrollRun {
  payslips: Payslip[];
}

export interface PaginatedPayrollRuns {
  data: PayrollRun[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreatePayrollRunDto {
  periodMonth: number;
  periodYear: number;
  notes?: string;
}

export interface UpdatePayslipDto {
  bonusAmount: number;
  unpaidLeaveDays: number;
  adjustments: PayrollAdjustment[];
}

export interface PayrollFilters {
  status?: PayrollRunStatus;
  year?: number;
  page?: number;
  limit?: number;
}

export interface PayslipPdfResult {
  status: 'ready' | 'generating';
  url: string | null;
}

// ─── Month helpers ────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatPeriod(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const payrollApi = {
  list: (filters?: PayrollFilters): Promise<PaginatedPayrollRuns> =>
    api.get('payroll-runs', { searchParams: filters as Record<string, string | number> }).json(),

  get: (id: string): Promise<PayrollRunDetail> =>
    api.get(`payroll-runs/${id}`).json(),

  create: (dto: CreatePayrollRunDto): Promise<PayrollRunDetail> =>
    api.post('payroll-runs', { json: dto }).json(),

  process: (id: string): Promise<PayrollRunDetail> =>
    api.post(`payroll-runs/${id}/process`).json(),

  markPaid: (id: string): Promise<PayrollRunDetail> =>
    api.post(`payroll-runs/${id}/mark-paid`).json(),

  delete: (id: string): Promise<void> =>
    api.delete(`payroll-runs/${id}`).then(() => undefined),

  updatePayslip: (runId: string, slipId: string, dto: UpdatePayslipDto): Promise<PayrollRunDetail> =>
    api.patch(`payroll-runs/${runId}/payslips/${slipId}`, { json: dto }).json(),

  getPayslipPdf: (runId: string, slipId: string): Promise<PayslipPdfResult> =>
    api.get(`payroll-runs/${runId}/payslips/${slipId}/pdf`).json(),
};
