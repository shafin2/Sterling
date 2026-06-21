'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { RecordPaymentSchema, type RecordPaymentDto, formatMoney, toMinorUnits, toMajorUnits } from '@sterling/shared';
import { invoicesApi, type Invoice } from '@/lib/api/invoices';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/ui/money-text';
import { Portal } from '@/components/ui/portal';

interface PaymentRecorderProps {
  open: boolean;
  invoice: Invoice;
  onClose: () => void;
}

type FormValues = {
  amount: number; // major units in UI
  method: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other';
  notes: string;
};

export function PaymentRecorder({ open, invoice, onClose }: PaymentRecorderProps) {
  const remaining = invoice.total - invoice.amountPaid;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      amount: toMajorUnits(remaining),
      method: 'bank_transfer',
      notes: '',
    },
  });

  React.useEffect(() => {
    reset({ amount: toMajorUnits(remaining), method: 'bank_transfer', notes: '' });
  }, [invoice.id, remaining, reset]);

  const save = useMutation({
    mutationFn: (data: FormValues) =>
      invoicesApi.recordPayment(invoice.id, {
        amount: toMinorUnits(data.amount),
        method: data.method,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Payment recorded');
      onClose();
    },
    onError: (err: any) => toast.error('Failed to record payment'),
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
          <div
            className="pointer-events-auto w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Record Payment</h2>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Balance info */}
            <div className="mb-5 rounded-xl bg-surface p-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted">Total</p>
                <MoneyText amount={invoice.total} currency={invoice.currency} className="text-sm font-bold text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted">Paid</p>
                <MoneyText amount={invoice.amountPaid} currency={invoice.currency} className="text-sm font-bold text-success" />
              </div>
              <div>
                <p className="text-xs text-muted">Remaining</p>
                <MoneyText amount={remaining} currency={invoice.currency} className="text-sm font-bold text-danger" />
              </div>
            </div>

            <form onSubmit={handleSubmit((data) => save.mutate(data))} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Amount ({invoice.currency}) *
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  max={toMajorUnits(remaining)}
                  {...register('amount', { valueAsNumber: true, required: true, min: 0.01 })}
                  className={inputCls}
                />
                {errors.amount && <p className="mt-1 text-xs text-danger">Valid amount required</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Payment Method</label>
                <select {...register('method')} className={inputCls}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
                <input
                  {...register('notes')}
                  placeholder="Reference number, notes…"
                  className={inputCls}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" loading={save.isPending}>
                  <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                </Button>
              </div>
            </form>
          </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted/60';
