import { api } from '@/lib/api';

export interface AuditLogUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: AuditLogUser | null;
}

export interface AuditLogListResponse {
  data: AuditLogEntry[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AuditLogFilters {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  action?: string | undefined;
  resource?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export const auditLogsApi = {
  list: (filters?: AuditLogFilters) =>
    api.get('audit-logs', { searchParams: filters as Record<string, string | number | undefined> }).json<AuditLogListResponse>(),

  resources: () =>
    api.get('audit-logs/resources').json<string[]>(),
};
