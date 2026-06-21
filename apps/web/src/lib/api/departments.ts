import { api } from '@/lib/api';
import type { CreateDepartmentDto, UpdateDepartmentDto } from '@sterling/shared';

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

const BASE = 'departments';

export const departmentsApi = {
  list: () => api.get(BASE).json<Department[]>(),
  get: (id: string) => api.get(`${BASE}/${id}`).json<Department>(),
  create: (dto: CreateDepartmentDto) => api.post(BASE, { json: dto }).json<Department>(),
  update: (id: string, dto: UpdateDepartmentDto) =>
    api.patch(`${BASE}/${id}`, { json: dto }).json<Department>(),
  delete: (id: string) => api.delete(`${BASE}/${id}`),
};
