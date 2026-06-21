export type Role = 'owner' | 'admin' | 'accountant' | 'hr' | 'viewer';
export * from './template.js';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export type PayrollStatus = 'draft' | 'processing' | 'completed' | 'paid';

export type EmployeeStatus = 'active' | 'inactive' | 'terminated';

export type ClientStatus = 'active' | 'inactive';

export type Currency = 'PKR' | 'USD' | 'EUR' | 'GBP';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
