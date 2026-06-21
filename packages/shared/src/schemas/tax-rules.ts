import { z } from 'zod';
import { PaginationSchema } from './pagination.js';

export const TaxAppliesToEnum = z.enum(['invoice', 'payroll', 'both']);

export const CreateTaxRuleSchema = z.object({
  name: z.string().min(1).max(100),
  rateBps: z.number().int().min(0).max(100000),
  appliesTo: TaxAppliesToEnum.default('invoice'),
  isActive: z.boolean().default(true),
});

export const UpdateTaxRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rateBps: z.number().int().min(0).max(100000).optional(),
  appliesTo: TaxAppliesToEnum.optional(),
  isActive: z.boolean().optional(),
});

export const TaxRuleFiltersSchema = PaginationSchema.extend({
  appliesTo: TaxAppliesToEnum.optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateTaxRuleDto = z.infer<typeof CreateTaxRuleSchema>;
export type UpdateTaxRuleDto = z.infer<typeof UpdateTaxRuleSchema>;
export type TaxRuleFiltersDto = z.infer<typeof TaxRuleFiltersSchema>;
