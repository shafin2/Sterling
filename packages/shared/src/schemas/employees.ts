import { z } from 'zod';

export const EmployeeStatusSchema = z.enum(['active', 'inactive', 'terminated']);

export const SalaryComponentSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().int().min(0), // minor units
});

export const CreateEmployeeSchema = z.object({
  code: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  departmentId: z.string().uuid().optional(),
  jobTitle: z.string().max(150).optional(),
  joinDate: z.string().date(),
  status: EmployeeStatusSchema.default('active'),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export const EmployeeFiltersSchema = z.object({
  search: z.string().optional(),
  status: EmployeeStatusSchema.optional(),
  departmentId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateSalaryStructureSchema = z.object({
  effectiveDate: z.string().date(),
  basicSalary: z.number().int().min(0), // minor units
  allowances: z.array(SalaryComponentSchema).default([]),
  deductions: z.array(SalaryComponentSchema).default([]),
});

export type EmployeeStatusType = z.infer<typeof EmployeeStatusSchema>;
export type SalaryComponentDto = z.infer<typeof SalaryComponentSchema>;
export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>;
export type EmployeeFiltersDto = z.infer<typeof EmployeeFiltersSchema>;
export type CreateSalaryStructureDto = z.infer<typeof CreateSalaryStructureSchema>;
