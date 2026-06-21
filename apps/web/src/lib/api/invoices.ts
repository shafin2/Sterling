import { api } from '@/lib/api';
import type {
  CreateInvoiceDto, UpdateInvoiceDto, InvoiceFiltersDto, RecordPaymentDto,
} from '@sterling/shared';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  notes?: string;
  paidAt: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  clientId: string;
  client?: { id: string; name: string; email?: string; phone?: string; billingAddress?: string; billingCity?: string; billingCountry?: string } | null;
  number: string;
  numberSequence: number;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  notes?: string;
  terms?: string;
  shareToken: string;
  templateId?: string | null;
  pdfPath?: string;
  viewedAt?: string;
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface PaginatedInvoices {
  data: Invoice[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  totals: { totalAmount: number };
}

const BASE = 'invoices';

export const invoicesApi = {
  list: (filters?: Partial<InvoiceFiltersDto>) =>
    api.get(BASE, { searchParams: filters as Record<string, string> }).json<PaginatedInvoices>(),

  get: (id: string) => api.get(`${BASE}/${id}`).json<Invoice>(),

  create: (dto: CreateInvoiceDto) => api.post(BASE, { json: dto }).json<Invoice>(),

  update: (id: string, dto: UpdateInvoiceDto) =>
    api.patch(`${BASE}/${id}`, { json: dto }).json<Invoice>(),

  delete: (id: string) => api.delete(`${BASE}/${id}`),

  duplicate: (id: string) => api.post(`${BASE}/${id}/duplicate`).json<Invoice>(),

  send: (id: string) => api.post(`${BASE}/${id}/send`).json<Invoice>(),

  recordPayment: (id: string, dto: RecordPaymentDto) =>
    api.post(`${BASE}/${id}/payments`, { json: dto }).json<Invoice>(),

  getPdfUrl: (id: string) =>
    api.get(`${BASE}/${id}/pdf`).json<{ status: 'ready' | 'generating'; pdfPath?: string; url?: string }>(),

  getByShareToken: (token: string) =>
    api.get(`public/invoices/${token}`).json<Invoice>(),
};
