'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Trash2, Save, Send, Eye, EyeOff, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreateInvoiceSchema, type CreateInvoiceDto, toMinorUnits, toMajorUnits, formatMoney, type TemplateLayout } from '@sterling/shared';
import { invoicesApi, type Invoice } from '@/lib/api/invoices';
import { clientsApi } from '@/lib/api/clients';
import { templatesApi } from '@/lib/api/templates';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LiveInvoicePreview } from './live-invoice-preview';

type FormItem = {
  description: string;
  quantity: number;
  unitPrice: number; // major units in UI
  sortOrder: number;
};

type FormValues = {
  clientId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;       // percentage (0–100) in UI
  discountAmount: number; // major units in UI
  notes: string;
  terms: string;
  templateId: string;
  items: FormItem[];
};

interface InvoiceEditorProps {
  invoice?: Invoice;
}

export function InvoiceEditor({ invoice }: InvoiceEditorProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = !!invoice;
  const [showPreview, setShowPreview] = React.useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');

  const today = new Date().toISOString().split('T')[0]!;
  const defaultDue = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: invoice
      ? {
          clientId: invoice.clientId,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          taxRate: invoice.taxRate / 100,
          discountAmount: toMajorUnits(invoice.discountAmount),
          notes: invoice.notes ?? '',
          terms: invoice.terms ?? '',
          templateId: invoice.templateId ?? '',
          items: (invoice.items ?? []).map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: toMajorUnits(i.unitPrice),
            sortOrder: i.sortOrder,
          })),
        }
      : {
          clientId: '',
          issueDate: today,
          dueDate: defaultDue,
          currency: 'PKR',
          taxRate: 0,
          discountAmount: 0,
          notes: '',
          terms: 'Payment is due within 30 days.',
          templateId: '',
          items: [{ description: '', quantity: 1, unitPrice: 0, sortOrder: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 1, '', ''],
    queryFn: () => clientsApi.list({ limit: 100 }),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  });

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get('tenants/me').json<{ name: string; logo: string | null }>(),
  });

  // Live values for preview
  const values = watch();
  const currency = values.currency ?? 'PKR';

  const lineItems = (values.items ?? []).map((item, i) => ({
    description: item.description,
    quantity: item.quantity || 0,
    unitPrice: toMinorUnits(item.unitPrice || 0),
    amount: Math.round((item.quantity || 0) * toMinorUnits(item.unitPrice || 0)),
    sortOrder: i,
  }));

  const subtotalMinor = lineItems.reduce((s, i) => s + i.amount, 0);
  const taxRateBp = (values.taxRate || 0) * 100; // percentage → basis points
  const taxMinor = Math.round((subtotalMinor * taxRateBp) / 10000);
  const discountMinor = toMinorUnits(values.discountAmount || 0);
  const totalMinor = Math.max(0, subtotalMinor + taxMinor - discountMinor);

  const toDto = (data: FormValues): CreateInvoiceDto => ({
    clientId: data.clientId,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    currency: data.currency,
    taxRate: Math.round((data.taxRate || 0) * 100),
    discountAmount: toMinorUnits(data.discountAmount || 0),
    notes: data.notes || undefined,
    terms: data.terms || undefined,
    templateId: data.templateId || undefined,
    items: data.items.map((item, i) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: toMinorUnits(item.unitPrice),
      sortOrder: i,
    })),
  });

  const saveMutation = useMutation({
    mutationFn: (dto: CreateInvoiceDto) =>
      isEdit ? invoicesApi.update(invoice!.id, dto) : invoicesApi.create(dto),
    onSuccess: (saved) => {
      toast.success(isEdit ? 'Invoice updated' : 'Invoice created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setAutoSaveStatus('saved');
      if (!isEdit) router.push(`/app/invoices/${saved.id}`);
      else qc.invalidateQueries({ queryKey: ['invoice', invoice!.id] });
    },
    onError: () => {
      toast.error('Failed to save invoice');
      setAutoSaveStatus('idle');
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      let invoiceId = invoice?.id;
      if (!invoiceId || isDirty) {
        const saved = await (isEdit
          ? invoicesApi.update(invoice!.id, toDto(data))
          : invoicesApi.create(toDto(data)));
        invoiceId = saved.id;
      }
      return invoicesApi.send(invoiceId!);
    },
    onSuccess: (sent) => {
      toast.success('Invoice sent!');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      router.push(`/app/invoices/${sent.id}`);
    },
    onError: () => toast.error('Failed to send invoice'),
  });

  // Auto-save draft on edits (debounced 3 s, only when editing existing draft)
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (!isEdit || !isDirty) return;
    setAutoSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const snapshot = watch();
      saveMutation.mutate(toDto(snapshot));
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), isEdit, isDirty]);

  const selectedClient = clientsData?.data.find((c) => c.id === values.clientId);

  const selectedTemplate = (templatesData ?? []).find((t) => t.id === values.templateId)
    ?? (templatesData ?? []).find((t) => t.isDefault)
    ?? templatesData?.[0];

  const previewLayout = (selectedTemplate?.layout ?? null) as TemplateLayout | null;

  const previewData = {
    number: isEdit ? invoice!.number : 'INV-XXXX',
    issueDate: values.issueDate ?? '',
    dueDate: values.dueDate ?? '',
    currency,
    status: 'draft',
    subtotal: subtotalMinor,
    taxRate: values.taxRate ?? 0,
    taxAmount: taxMinor,
    discountAmount: discountMinor,
    total: totalMinor,
    amountPaid: 0,
    notes: values.notes || null,
    terms: values.terms || null,
    client: selectedClient
      ? {
          name: selectedClient.name,
          email: selectedClient.email ?? null,
          billingAddress: selectedClient.billingAddress ?? null,
          billingCity: selectedClient.billingCity ?? null,
          billingCountry: selectedClient.billingCountry ?? null,
        }
      : null,
    companyName: tenantProfile?.name ?? 'Your Company',
    logoUrl: tenantProfile?.logo ?? null,
    items: lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
  };

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border bg-background px-4 sm:px-6 py-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/app/invoices"><ArrowLeft className="mr-1 h-4 w-4" /> Invoices</Link>
            </Button>
            <span className="text-muted hidden sm:inline">/</span>
            <span className="font-semibold text-foreground truncate">
              {isEdit ? `Edit ${invoice.number}` : 'New Invoice'}
            </span>
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-muted shrink-0">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-xs text-success shrink-0">Saved</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview((p) => !p)}
              className="hidden lg:flex"
            >
              {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={saveMutation.isPending && !sendMutation.isPending}
              onClick={handleSubmit((data) => {
                setAutoSaveStatus('idle');
                saveMutation.mutate(toDto(data));
              })}
            >
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            <Button
              size="sm"
              loading={sendMutation.isPending}
              onClick={handleSubmit((data) => sendMutation.mutate(data))}
            >
              <Send className="mr-2 h-4 w-4" /> Send
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Editor + Preview split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — form */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Client + Dates */}
          <div className="rounded-2xl border border-border bg-background p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Invoice Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Client *</label>
                <select {...register('clientId', { required: true })} className={inputCls}>
                  <option value="">Select a client…</option>
                  {clientsData?.data.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.clientId && <p className="mt-1 text-xs text-danger">Client is required</p>}
              </div>
              <div>
                <label className={labelCls}>Issue Date *</label>
                <input
                  type="date"
                  {...register('issueDate', { required: true })}
                  className={inputCls}
                />
                {errors.issueDate && <p className="mt-1 text-xs text-danger">Issue date is required</p>}
              </div>
              <div>
                <label className={labelCls}>Due Date *</label>
                <input
                  type="date"
                  {...register('dueDate', {
                    required: true,
                    validate: (val) =>
                      !values.issueDate || val >= values.issueDate || 'Due date must be on or after issue date',
                  })}
                  className={inputCls}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-xs text-danger">{errors.dueDate.message ?? 'Due date is required'}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <select {...register('currency')} className={inputCls}>
                  {['PKR', 'USD', 'GBP', 'EUR', 'AED'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Invoice Template</label>
                <select {...register('templateId')} className={inputCls}>
                  <option value="">Use default template</option>
                  {(templatesData ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (Default)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-2xl border border-border bg-background p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Line Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0, sortOrder: fields.length })}
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            {errors.items?.root && (
              <p className="text-xs text-danger">{errors.items.root.message}</p>
            )}
            {fields.length === 0 && (
              <p className="text-xs text-danger">At least one line item is required</p>
            )}

            {/* Desktop header */}
            <div className="hidden sm:grid grid-cols-[1fr_72px_112px_96px_32px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Amount</span>
              <span />
            </div>

            {fields.map((field, i) => {
              const qty = values.items[i]?.quantity || 0;
              const up = values.items[i]?.unitPrice || 0;
              const amt = formatMoney(Math.round(qty * toMinorUnits(up)), currency);
              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 sm:space-y-0 rounded-lg sm:rounded-none border border-border sm:border-0 p-3 sm:p-0 bg-surface/30 sm:bg-transparent"
                >
                  {/* Mobile label row */}
                  <div className="flex items-center justify-between sm:hidden">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Item {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={fields.length === 1}
                      className="rounded p-1 text-muted hover:text-danger transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Desktop grid / Mobile stacked */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_72px_112px_96px_32px] sm:items-start">
                    <input
                      {...register(`items.${i}.description`, { required: true })}
                      placeholder="Description…"
                      className={`${inputCls} ${errors.items?.[i]?.description ? 'border-danger' : ''}`}
                    />
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                      <div>
                        <label className="block text-xs text-muted mb-1 sm:hidden">Qty</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          {...register(`items.${i}.quantity`, { valueAsNumber: true, min: 0 })}
                          className={`${inputCls} sm:text-right`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1 sm:hidden">Unit Price</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          {...register(`items.${i}.unitPrice`, { valueAsNumber: true, min: 0 })}
                          placeholder="0.00"
                          className={`${inputCls} sm:text-right`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="flex-1 sm:flex-none sm:w-24 flex items-center justify-end rounded-lg border border-border bg-surface px-3 py-2 text-sm tabular-nums font-mono text-foreground">
                        {amt}
                      </div>
                      {/* Desktop remove */}
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        disabled={fields.length === 1}
                        className="hidden sm:flex items-center justify-center rounded p-1 text-muted hover:text-danger transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {errors.items?.[i]?.description && (
                    <p className="text-xs text-danger">Description is required</p>
                  )}
                </motion.div>
              );
            })}

            {/* Totals */}
            <div className="ml-auto w-full sm:w-64 space-y-1.5 border-t border-border pt-3">
              <TotalRow label="Subtotal" value={formatMoney(subtotalMinor, currency)} />
              {values.taxRate > 0 && (
                <TotalRow label={`Tax (${values.taxRate}%)`} value={formatMoney(taxMinor, currency)} />
              )}
              {discountMinor > 0 && (
                <TotalRow label="Discount" value={`− ${formatMoney(discountMinor, currency)}`} />
              )}
              <div className="border-t border-border pt-2">
                <TotalRow label="Total" value={formatMoney(totalMinor, currency)} bold />
              </div>
            </div>
          </div>

          {/* Tax & Discount */}
          <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Adjustments</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Tax Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  {...register('taxRate', { valueAsNumber: true, min: 0, max: 100 })}
                  placeholder="0"
                  className={inputCls}
                />
                {errors.taxRate && <p className="mt-1 text-xs text-danger">Tax rate must be between 0 and 100</p>}
              </div>
              <div>
                <label className={labelCls}>Discount ({currency})</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  {...register('discountAmount', { valueAsNumber: true, min: 0 })}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="rounded-2xl border border-border bg-background p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Notes & Terms</h3>
            <div>
              <label className={labelCls}>Notes (shown on invoice)</label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Thank you for your business…"
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className={labelCls}>Terms & Conditions</label>
              <textarea
                {...register('terms')}
                rows={3}
                placeholder="Payment is due within 30 days…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Right — live preview (desktop only) */}
        {showPreview && (
          <div className="hidden lg:flex flex-col w-[440px] shrink-0 overflow-y-auto border-l border-border bg-surface/30 p-4 gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Live Preview</p>
              {selectedTemplate && (
                <span className="text-xs text-muted-foreground bg-surface border border-border rounded px-2 py-0.5">
                  {selectedTemplate.name}
                </span>
              )}
            </div>
            {previewLayout ? (
              <LiveInvoicePreview layout={previewLayout} data={previewData} />
            ) : (
              <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Loading template…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const labelCls = 'mb-1.5 block text-sm font-medium text-foreground';
const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted/60';

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? 'font-semibold text-foreground' : 'text-muted'}>{label}</span>
      <span className={`tabular-nums font-mono ${bold ? 'font-bold text-primary text-base' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
