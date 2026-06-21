'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateEmployeeSchema, type CreateEmployeeDto } from '@sterling/shared';
import { employeesApi, type Employee } from '@/lib/api/employees';
import { type Department } from '@/lib/api/departments';
import { Button } from '@/components/ui/button';

interface EmployeeDrawerProps {
  open: boolean;
  employee: Employee | null;
  departments: Department[];
  onClose: () => void;
}

export function EmployeeDrawer({ open, employee, departments, onClose }: EmployeeDrawerProps) {
  const qc = useQueryClient();
  const isEdit = !!employee;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEmployeeDto>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: { status: 'active' },
  });

  React.useEffect(() => {
    if (employee) {
      reset({
        code: employee.code,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email ?? '',
        phone: employee.phone ?? '',
        departmentId: employee.departmentId ?? undefined,
        jobTitle: employee.jobTitle ?? '',
        joinDate: employee.joinDate,
        status: employee.status,
      });
    } else {
      reset({ status: 'active', joinDate: new Date().toISOString().split('T')[0] });
    }
  }, [employee, reset]);

  const save = useMutation({
    mutationFn: (dto: CreateEmployeeDto) =>
      isEdit ? employeesApi.update(employee!.id, dto) : employeesApi.create(dto),
    onSuccess: () => {
      toast.success(isEdit ? 'Employee updated' : 'Employee created');
      qc.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: () => toast.error('Failed to save employee'),
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold">
                {isEdit ? 'Edit Employee' : 'New Employee'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((dto) => save.mutate(dto))}
              className="flex flex-1 flex-col overflow-y-auto"
            >
              <div className="space-y-5 px-6 py-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name *" error={errors.firstName?.message}>
                    <input {...register('firstName')} placeholder="Ali" className={inputCls} />
                  </Field>
                  <Field label="Last Name *" error={errors.lastName?.message}>
                    <input {...register('lastName')} placeholder="Khan" className={inputCls} />
                  </Field>
                </div>

                <Field label="Employee Code *" error={errors.code?.message}>
                  <input {...register('code')} placeholder="EMP-001" className={inputCls} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email" error={errors.email?.message}>
                    <input {...register('email')} type="email" placeholder="ali@company.com" className={inputCls} />
                  </Field>
                  <Field label="Phone" error={errors.phone?.message}>
                    <input {...register('phone')} placeholder="+92 300 0000000" className={inputCls} />
                  </Field>
                </div>

                <Field label="Job Title" error={errors.jobTitle?.message}>
                  <input {...register('jobTitle')} placeholder="Software Engineer" className={inputCls} />
                </Field>

                <Field label="Department">
                  <select {...register('departmentId')} className={inputCls}>
                    <option value="">No department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Join Date *" error={errors.joinDate?.message}>
                    <input {...register('joinDate')} type="date" className={inputCls} />
                  </Field>
                  <Field label="Status">
                    <select {...register('status')} className={inputCls}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" loading={save.isPending}>
                  {isEdit ? 'Save Changes' : 'Create Employee'}
                </Button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted/60';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
