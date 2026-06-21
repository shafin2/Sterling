import { api } from '@/lib/api';
import type { CreateClientDto, UpdateClientDto, ClientFiltersDto } from '@sterling/shared';

export interface Client {
  id: string;
  tenantId: string;
  type: 'company' | 'person';
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  currency: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPostalCode?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedClients {
  data: Client[];
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

const BASE = 'clients';

export const clientsApi = {
  list: (filters?: Partial<ClientFiltersDto>) =>
    api.get(BASE, { searchParams: toSearchParams((filters ?? {}) as Record<string, unknown>) }).json<PaginatedClients>(),

  get: (id: string) => api.get(`${BASE}/${id}`).json<Client>(),

  create: (dto: CreateClientDto) =>
    api.post(BASE, { json: dto }).json<Client>(),

  update: (id: string, dto: UpdateClientDto) =>
    api.patch(`${BASE}/${id}`, { json: dto }).json<Client>(),

  delete: (id: string) => api.delete(`${BASE}/${id}`),

  bulkDelete: (ids: string[]) =>
    api.post(`${BASE}/bulk-delete`, { json: { ids } }).json<{ success: boolean; count: number }>(),

  importCsv: (rows: CreateClientDto[]) =>
    api.post(`${BASE}/import/csv`, { json: { rows } }).json<{ created: number; errors: { row: number; error: string }[] }>(),
};
