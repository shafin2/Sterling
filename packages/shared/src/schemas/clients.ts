import { z } from 'zod';

export const ClientTypeSchema = z.enum(['company', 'person']);
export const ClientStatusSchema = z.enum(['active', 'inactive']);

export const CreateClientSchema = z.object({
  type: ClientTypeSchema.default('company'),
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal('')),
  taxId: z.string().max(100).optional(),
  currency: z.string().max(10).default('PKR'),
  billingAddress: z.string().optional(),
  billingCity: z.string().max(100).optional(),
  billingState: z.string().max(100).optional(),
  billingCountry: z.string().max(100).default('Pakistan'),
  billingPostalCode: z.string().max(20).optional(),
  notes: z.string().optional(),
  status: ClientStatusSchema.default('active'),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export const ClientFiltersSchema = z.object({
  search: z.string().optional(),
  status: ClientStatusSchema.optional(),
  type: ClientTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateClientDto = z.infer<typeof CreateClientSchema>;
export type UpdateClientDto = z.infer<typeof UpdateClientSchema>;
export type ClientFiltersDto = z.infer<typeof ClientFiltersSchema>;
