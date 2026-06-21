'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateSalaryStructureSchema, type CreateSalaryStructureDto } from '@sterling/shared';
import { employeesApi, type SalaryStructure } from '@/lib/api/employees';
import { Button } from '@/components/ui/button';
import { Portal } from '@/components/ui/portal';
import { formatMoney, toMajorUnits, toMinorUnits } from '@sterling/shared';

interface SalaryEditorProps {
  open: boolean;
  employeeId: string;
  current: SalaryStructure | null;
  onClose: () => void;
}

type FormValues = {
  effectiveDate: string;
  basicSalary: number; // in major units for the form (PKR), converted to minor on save
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
};

export function SalaryEditor({ open, employeeId, current, onClose }: SalaryEditorProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      effectiveDate: new Date().toISOString().split('T')[0],
      basicSalary: 0,
      allowances: [],
      deductions: [],
    },
  });

  const { fields: allowanceFields, append: addAllowance, remove: removeAllowance } =
    useFieldArray({ control, name: 'allowances' });

  const { fields: deductionFields, append: addDeduction, remove: removeDeduction } =
    useFieldArray({ control, name: 'deductions' });

  React.useEffect(() => {
    if (current) {
      reset({
        effectiveDate: new Date().toISOString().split('T')[0],
        basicSalary: toMajorUnits(current.basicSalary),
        allowances: (current.allowances as { name: string; amount: number }[]).map((a) => ({
          name: a.name,
          amount: toMajorUnits(a.amount),
        })),
        deductions: (current.deductions as { name: string; amount: number }[]).map((d) => ({
          name: d.name,
          amount: toMajorUnits(d.amount),
        })),
      });
    } else {
      reset({
        effectiveDate: new Date().toISOString().split('T')[0],
        basicSalary: 0,
        allowances: [],
        deductions: [],
      });
    }
  }, [current, reset]);

  // Live preview
  const values = watch();
  const basicMinor = toMinorUnits(values.basicSalary || 0);
  const allowancesMinor = (values.allowances || []).reduce((s, a) => s + toMinorUnits(a.amount || 0), 0);
  const deductionsMinor = (values.deductions || []).reduce((s, d) => s + toMinorUnits(d.amount || 0), 0);
  const grossMinor = basicMinor + allowancesMinor;
  const netMinor = grossMinor - deductionsMinor;

  const save = useMutation({
    mutationFn: (data: FormValues) =>
      employeesApi.upsertSalary(employeeId, {
        effectiveDate: data.effectiveDate,
        basicSalary: toMinorUnits(data.basicSalary),
        allowances: data.allowances.map((a) => ({ name: a.name, amount: toMinorUnits(a.amount) })),
        deductions: data.deductions.map((d) => ({ name: d.name, amount: toMinorUnits(d.amount) })),
      }),
    onSuccess: () => {
      toast.success('Salary structure saved');
      onClose();
    },
    onError: () => toast.error('Failed to save salary'),
  });

  return (
    <AnimatePresence>
      {open && (
        <Portal>
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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold">
                {current ? 'Update Salary Structure' : 'Set Salary Structure'}
              </h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((data) => save.mutate(data))}
              className="flex flex-1 flex-col overflow-y-auto"
            >
              <div className="space-y-6 px-6 py-5">
                {/* Effective date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Effective Date *</label>
                  <input
                    type="date"
                    {...register('effectiveDate', { required: true })}
                    className={`${inputCls} w-full`}
                  />
                </div>

                {/* Basic Salary */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Basic Salary (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    {...register('basicSalary', { valueAsNumber: true })}
                    className={`${inputCls} w-full`}
                    placeholder="50000"
                  />
                </div>

                {/* Allowances */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Allowances</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addAllowance({ name: '', amount: 0 })}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                  {allowanceFields.length === 0 && (
                    <p className="text-xs text-muted">No allowances added.</p>
                  )}
                  {allowanceFields.map((field, i) => (
                    <div key={field.id} className="mb-2 flex items-center gap-2">
                      <input
                        {...register(`allowances.${i}.name`)}
                        placeholder="Allowance name"
                        className={`${inputCls} min-w-0 flex-1`}
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        {...register(`allowances.${i}.amount`, { valueAsNumber: true })}
                        placeholder="Amount"
                        className={`${inputCls} w-28 shrink-0`}
                      />
                      <button
                        type="button"
                        onClick={() => removeAllowance(i)}
                        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Deductions */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Deductions</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addDeduction({ name: '', amount: 0 })}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                  {deductionFields.length === 0 && (
                    <p className="text-xs text-muted">No deductions added.</p>
                  )}
                  {deductionFields.map((field, i) => (
                    <div key={field.id} className="mb-2 flex items-center gap-2">
                      <input
                        {...register(`deductions.${i}.name`)}
                        placeholder="Deduction name"
                        className={`${inputCls} min-w-0 flex-1`}
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        {...register(`deductions.${i}.amount`, { valueAsNumber: true })}
                        placeholder="Amount"
                        className={`${inputCls} w-28 shrink-0`}
                      />
                      <button
                        type="button"
                        onClick={() => removeDeduction(i)}
                        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Live preview */}
                <div className="rounded-xl border border-border bg-surface/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Live Preview</p>
                  <div className="space-y-2 text-sm">
                    <PreviewRow label="Basic" amount={basicMinor} />
                    <PreviewRow label="+ Allowances" amount={allowancesMinor} color="text-success" />
                    <div className="border-t border-border pt-2">
                      <PreviewRow label="Gross" amount={grossMinor} bold />
                    </div>
                    <PreviewRow label="− Deductions" amount={deductionsMinor} color="text-danger" />
                    <div className="border-t border-border pt-2">
                      <PreviewRow label="Net Pay" amount={netMinor} bold color="text-primary" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" loading={save.isPending}>Save Structure</Button>
              </div>
            </form>
          </motion.aside>
        </Portal>
      )}
    </AnimatePresence>
  );
}

function PreviewRow({
  label,
  amount,
  bold,
  color,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-semibold text-foreground' : 'text-muted'}>{label}</span>
      <span className={`font-mono tabular-nums ${bold ? 'font-bold' : ''} ${color ?? 'text-foreground'}`}>
        {formatMoney(amount, 'PKR')}
      </span>
    </div>
  );
}

const inputCls =
  'rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted/60';
