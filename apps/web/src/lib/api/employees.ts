import { api } from '@/lib/api';
import type { CreateEmployeeDto, UpdateEmployeeDto, EmployeeFiltersDto, CreateSalaryStructureDto } from '@sterling/shared';

export interface Employee {
  id: string;
  tenantId: string;
  code: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  departmentId?: string;
  department?: { id: string; name: string } | null;
  jobTitle?: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'terminated';
  createdAt: string;
  updatedAt: string;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  effectiveDate: string;
  basicSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  isCurrent: boolean;
  createdAt: string;
}

export interface PaginatedEmployees {
  data: Employee[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function toSearchParams(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      out[k] = String(v);
    }
  }
  return out;
}

const BASE = 'employees';

export const employeesApi = {
  list: (filters?: Partial<EmployeeFiltersDto>) =>
    api.get(BASE, { searchParams: toSearchParams((filters ?? {}) as Record<string, unknown>) }).json<PaginatedEmployees>(),

  get: (id: string) => api.get(`${BASE}/${id}`).json<Employee>(),

  create: (dto: CreateEmployeeDto) => api.post(BASE, { json: dto }).json<Employee>(),

  update: (id: string, dto: UpdateEmployeeDto) =>
    api.patch(`${BASE}/${id}`, { json: dto }).json<Employee>(),

  delete: (id: string) => api.delete(`${BASE}/${id}`),

  getSalaryHistory: (id: string) =>
    api.get(`${BASE}/${id}/salary/history`).json<SalaryStructure[]>(),

  getCurrentSalary: (id: string) =>
    api.get(`${BASE}/${id}/salary/current`).json<SalaryStructure | null>(),

  upsertSalary: (id: string, dto: CreateSalaryStructureDto) =>
    api.post(`${BASE}/${id}/salary`, { json: dto }).json<SalaryStructure>(),
};
