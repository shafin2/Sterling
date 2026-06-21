import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  revenue: { total: number; count: number; trend: number | null };
  outstanding: { total: number; count: number };
  overdue: { total: number; count: number };
  payroll: { thisMonth: number; lastMonth: number };
  clients: { active: number };
  employees: { active: number };
  invoiceStatus: { status: string; count: number; total: number }[];
}

export interface MonthlyRevenue {
  month: number;
  name: string;
  revenue: number;
  invoiceCount: number;
}

export interface MonthlyPayroll {
  month: number;
  name: string;
  net: number;
  gross: number;
  employees: number;
}

export interface CashflowData {
  month: number;
  name: string;
  revenue: number;
  payroll: number;
  cashflow: number;
}

export interface AgingBucket {
  label: string;
  key: string;
  amount: number;
  count: number;
}

export interface TopClient {
  clientId: string;
  clientName: string;
  totalPaid: number;
  invoiceCount: number;
}

export interface UpcomingDue {
  id: string;
  number: string;
  clientName: string;
  dueDate: string;
  balance: number;
  currency: string;
  daysUntilDue: number;
}

export interface AiInsight {
  summary: string;
  highlights: string[];
  recommendation: string;
  generatedAt: string;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const analyticsApi = {
  dashboard: () =>
    api.get('analytics/dashboard').json<DashboardStats>(),

  revenue: (year?: number) =>
    api.get('analytics/revenue', { searchParams: year ? { year } : {} }).json<MonthlyRevenue[]>(),

  payroll: (year?: number) =>
    api.get('analytics/payroll', { searchParams: year ? { year } : {} }).json<MonthlyPayroll[]>(),

  cashflow: (year?: number) =>
    api.get('analytics/cashflow', { searchParams: year ? { year } : {} }).json<CashflowData[]>(),

  aging: () =>
    api.get('analytics/aging').json<AgingBucket[]>(),

  topClients: () =>
    api.get('analytics/top-clients').json<TopClient[]>(),

  upcomingDues: () =>
    api.get('analytics/upcoming-dues').json<UpcomingDue[]>(),

  aiInsights: (year?: number) =>
    api.get('analytics/ai-insights', { searchParams: year ? { year } : {} }).json<AiInsight>(),
};

// ─── CSV export helpers ───────────────────────────────────────────────────────

async function triggerCsvDownload(path: string, filename: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');
  const response = await fetch(`${base}/${path}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportApi = {
  invoices: () => triggerCsvDownload('exports/invoices.csv', `invoices-${today()}.csv`),
  clients: () => triggerCsvDownload('exports/clients.csv', `clients-${today()}.csv`),
  employees: () => triggerCsvDownload('exports/employees.csv', `employees-${today()}.csv`),
  payrollRun: (id: string) => triggerCsvDownload(`exports/payroll-runs/${id}.csv`, `payroll-${id}.csv`),
};

function today() {
  return new Date().toISOString().split('T')[0];
}
