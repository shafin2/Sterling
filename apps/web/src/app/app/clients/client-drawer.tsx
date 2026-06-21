'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateClientSchema, type CreateClientDto } from '@sterling/shared';
import { clientsApi, type Client } from '@/lib/api/clients';
import { Button } from '@/components/ui/button';

interface ClientDrawerProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}

export function ClientDrawer({ open, client, onClose }: ClientDrawerProps) {
  const qc = useQueryClient();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateClientDto>({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: {
      type: 'company',
      currency: 'PKR',
      billingCountry: 'Pakistan',
      status: 'active',
    },
  });

  React.useEffect(() => {
    if (client) {
      reset({
        type: client.type,
        name: client.name,
        email: client.email ?? '',
        phone: client.phone ?? '',
        website: client.website ?? '',
        taxId: client.taxId ?? '',
        currency: client.currency,
        billingAddress: client.billingAddress ?? '',
        billingCity: client.billingCity ?? '',
        billingState: client.billingState ?? '',
        billingCountry: client.billingCountry ?? 'Pakistan',
        billingPostalCode: client.billingPostalCode ?? '',
        notes: client.notes ?? '',
        status: client.status,
      });
    } else {
      reset({ type: 'company', currency: 'PKR', billingCountry: 'Pakistan', status: 'active' });
    }
  }, [client, reset]);

  const save = useMutation({
    mutationFn: (dto: CreateClientDto) =>
      isEdit ? clientsApi.update(client!.id, dto) : clientsApi.create(dto),
    onSuccess: () => {
      toast.success(isEdit ? 'Client updated' : 'Client created');
      qc.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: () => toast.error('Failed to save client'),
  });

  const type = watch('type');

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold">
                {isEdit ? 'Edit Client' : 'New Client'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit((dto) => save.mutate(dto))}
              className="flex flex-1 flex-col overflow-y-auto"
            >
              <div className="space-y-5 px-6 py-5">
                {/* Type toggle */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
                  <div className="flex gap-2">
                    {(['company', 'person'] as const).map((t) => (
                      <label
                        key={t}
                        className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                          type === t
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('type')}
                          value={t}
                          className="sr-only"
                        />
                        {t === 'company' ? (
                          <Building2 className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>

                <Field label="Name *" error={errors.name?.message}>
                  <input {...register('name')} placeholder="Acme Corp" className={inputCls} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email" error={errors.email?.message}>
                    <input {...register('email')} type="email" placeholder="billing@acme.com" className={inputCls} />
                  </Field>
                  <Field label="Phone" error={errors.phone?.message}>
                    <input {...register('phone')} placeholder="+92 300 0000000" className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Website" error={errors.website?.message}>
                    <input {...register('website')} placeholder="https://acme.com" className={inputCls} />
                  </Field>
                  <Field label="Tax ID / NTN" error={errors.taxId?.message}>
                    <input {...register('taxId')} placeholder="1234567-8" className={inputCls} />
                  </Field>
                </div>

                <Field label="Currency" error={errors.currency?.message}>
                  <select {...register('currency')} className={inputCls}>
                    <option value="PKR">PKR — Pakistani Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="AED">AED — UAE Dirham</option>
                  </select>
                </Field>

                <fieldset className="space-y-3 rounded-lg border border-border p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Billing Address
                  </legend>
                  <Field label="Street" error={errors.billingAddress?.message}>
                    <input {...register('billingAddress')} placeholder="123 Main St" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City">
                      <input {...register('billingCity')} placeholder="Karachi" className={inputCls} />
                    </Field>
                    <Field label="State">
                      <input {...register('billingState')} placeholder="Sindh" className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Country">
                      <input {...register('billingCountry')} placeholder="Pakistan" className={inputCls} />
                    </Field>
                    <Field label="Postal Code">
                      <input {...register('billingPostalCode')} placeholder="75600" className={inputCls} />
                    </Field>
                  </div>
                </fieldset>

                <Field label="Notes">
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Internal notes…"
                    className={`${inputCls} resize-none`}
                  />
                </Field>

                <Field label="Status">
                  <select {...register('status')} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              {/* Footer */}
              <div className="mt-auto flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={save.isPending}>
                  {isEdit ? 'Save Changes' : 'Create Client'}
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
