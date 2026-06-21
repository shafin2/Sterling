import { z } from 'zod';

export const PayrollRunStatusSchema = z.enum(['draft', 'processing', 'completed', 'paid']);
export const PayslipStatusSchema = z.enum(['draft', 'processed', 'paid']);

export const CreatePayrollRunSchema = z.object({
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2000).max(2100),
  notes: z.string().max(1000).optional(),
});

export const UpdatePayslipSchema = z.object({
  bonusAmount: z.number().int().min(0).default(0),
  unpaidLeaveDays: z.number().int().min(0).default(0),
  adjustments: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        amount: z.number().int().min(0),
        type: z.enum(['addition', 'deduction']),
      }),
    )
    .default([]),
});

export const PayrollFiltersSchema = z.object({
  status: PayrollRunStatusSchema.optional(),
  year: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePayrollRunDto = z.infer<typeof CreatePayrollRunSchema>;
export type UpdatePayslipDto = z.infer<typeof UpdatePayslipSchema>;
export type PayrollFiltersDto = z.infer<typeof PayrollFiltersSchema>;
export type PayrollRunStatus = z.infer<typeof PayrollRunStatusSchema>;
export type PayslipStatus = z.infer<typeof PayslipStatusSchema>;

export type PayrollAdjustment = {
  name: string;
  amount: number;
  type: 'addition' | 'deduction';
};
