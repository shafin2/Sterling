import { z } from 'zod';

export const InvoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue']);
export const PaymentMethodSchema = z.enum(['cash', 'bank_transfer', 'cheque', 'online', 'other']);

export const InvoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().int().min(0), // minor units
  sortOrder: z.number().int().min(0).default(0),
});

export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  currency: z.string().max(10).default('PKR'),
  taxRate: z.number().int().min(0).max(10000).default(0), // basis points
  discountAmount: z.number().int().min(0).default(0),     // minor units
  notes: z.string().optional(),
  terms: z.string().optional(),
  templateId: z.string().uuid().optional().nullable(),
  items: z.array(InvoiceItemSchema).min(1, 'At least one line item is required'),
});

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial();

export const InvoiceFiltersSchema = z.object({
  search: z.string().optional(),
  status: InvoiceStatusSchema.optional(),
  clientId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RecordPaymentSchema = z.object({
  amount: z.number().int().positive(), // minor units
  method: PaymentMethodSchema.default('bank_transfer'),
  notes: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

export type InvoiceItemDto = z.infer<typeof InvoiceItemSchema>;
export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceSchema>;
export type InvoiceFiltersDto = z.infer<typeof InvoiceFiltersSchema>;
export type RecordPaymentDto = z.infer<typeof RecordPaymentSchema>;
export type InvoiceStatusType = z.infer<typeof InvoiceStatusSchema>;
export type PaymentMethodType = z.infer<typeof PaymentMethodSchema>;
