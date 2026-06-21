'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { use } from 'react';
import {
  ArrowLeft, Send, Copy, Share2, Pencil,
  Trash2, CheckCircle, Clock, Eye, CreditCard, FileText, QrCode,
  Download, AlertCircle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { invoicesApi, type Invoice, type Payment } from '@/lib/api/invoices';
import { templatesApi } from '@/lib/api/templates';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MoneyText } from '@/components/ui/money-text';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentRecorder } from '@/components/invoices/payment-recorder';
import { LiveInvoicePreview } from '@/components/invoices/live-invoice-preview';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { renderInvoiceToHtml, type TemplateLayout, type InvoiceRenderData } from '@sterling/shared';

const FALLBACK_LAYOUT: TemplateLayout = {
  version: 1,
  theme: {
    primaryColor: '#3D52A0', accentColor: '#7091E6', textColor: '#1a1a2e',
    mutedColor: '#8697C4', borderColor: '#ADBBDA', fontFamily: 'system', paperSize: 'A4',
  },
  blocks: [
    { id: 'header', type: 'header', visible: true, settings: { title: 'INVOICE', showCompanyName: true, showInvoiceNumber: true, showStatus: true, layout: 'split' } },
    { id: 'spacer1', type: 'spacer', visible: true, settings: { height: 8 } },
    { id: 'client-info', type: 'client-info', visible: true, settings: { label: 'Bill To', showEmail: true, showPhone: false, showAddress: true } },
    { id: 'invoice-meta', type: 'invoice-meta', visible: true, settings: { label: 'Invoice Details', showIssueDate: true, showDueDate: true, showCurrency: false } },
    { id: 'divider1', type: 'divider', visible: true, settings: { thickness: 1, color: '', style: 'solid' } },
    { id: 'items-table', type: 'items-table', visible: true, settings: { showQty: true, showUnitPrice: true, alternateRows: true, headerBgColor: '#3D52A0' } },
    { id: 'spacer2', type: 'spacer', visible: true, settings: { height: 8 } },
    { id: 'totals', type: 'totals', visible: true, settings: { showSubtotal: true, showTax: true, showDiscount: true, showAmountPaid: true } },
    { id: 'spacer3', type: 'spacer', visible: true, settings: { height: 16 } },
    { id: 'notes', type: 'notes', visible: true, settings: { label: 'Notes', customText: '' } },
    { id: 'terms', type: 'terms', visible: true, settings: { label: 'Terms & Conditions', customText: '' } },
    { id: 'spacer4', type: 'spacer', visible: true, settings: { height: 24 } },
    { id: 'footer', type: 'footer', visible: true, settings: { text: 'Thank you for your business!', showBranding: true } },
  ],
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = React.useState(false);
  const [pdfGenerating, setPdfGenerating] = React.useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id),
  });

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get('tenants/me').json<{ name: string; logo: string | null }>(),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  });

  const { data: qrData, isLoading: qrLoading, error: qrError, refetch: refetchQr } = useQuery({
    queryKey: ['invoice', id, 'qr'],
    queryFn: () => api.get(`invoices/${id}/qr`).json<{ qrDataUrl: string }>(),
    enabled: showQr,
    staleTime: Infinity,
    retry: 2,
  });

  const sendMutation = useMutation({
    mutationFn: () => invoicesApi.send(id),
    onSuccess: () => {
      toast.success('Invoice sent!');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: () => toast.error('Failed to send invoice'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => invoicesApi.delete(id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      router.push('/app/invoices');
    },
    onError: () => toast.error('Only draft invoices can be deleted'),
  });

  const copyShareLink = () => {
    if (!invoice) return;
    const url = `${window.location.origin}/invoice/${invoice.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied!');
  };

  // Resolve the template layout for this invoice
  const resolveLayout = (): TemplateLayout => {
    const templates = templatesData ?? [];
    if (invoice?.templateId) {
      const t = templates.find((t) => t.id === invoice.templateId);
      if (t) return t.layout as TemplateLayout;
    }
    const def = templates.find((t) => t.isDefault) ?? templates[0];
    return (def?.layout as TemplateLayout | undefined) ?? FALLBACK_LAYOUT;
  };

  // Build InvoiceRenderData from the loaded invoice
  const buildRenderData = (inv: Invoice): InvoiceRenderData => ({
    number: inv.number,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    currency: inv.currency,
    status: inv.status,
    subtotal: inv.subtotal,
    taxRate: inv.taxRate,
    taxAmount: inv.taxAmount,
    discountAmount: inv.discountAmount,
    total: inv.total,
    amountPaid: inv.amountPaid,
    notes: inv.notes ?? null,
    terms: inv.terms ?? null,
    companyName: tenantProfile?.name ?? 'Your Company',
    logoUrl: tenantProfile?.logo ?? null,
    client: inv.client
      ? {
          name: inv.client.name,
          email: inv.client.email ?? null,
          billingAddress: inv.client.billingAddress ?? null,
          billingCity: inv.client.billingCity ?? null,
          billingCountry: inv.client.billingCountry ?? null,
        }
      : null,
    items: (inv.items ?? []).map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: i.amount,
    })),
  });

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setPdfGenerating(true);
    try {
      const layout = resolveLayout();
      const data = buildRenderData(invoice);
      const html = renderInvoiceToHtml(layout, data);

      const win = window.open('', '_blank');
      if (!win) {
        toast.error('Please allow pop-ups to download the PDF.');
        return;
      }
      win.document.write(html);
      win.document.close();
      // Give the iframe / images a moment to load before print dialog
      setTimeout(() => {
        win.focus();
        win.print();
      }, 700);
    } catch {
      toast.error('Failed to generate PDF.');
    } finally {
      setPdfGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const remainingBalance = invoice.total - invoice.amountPaid;
  const currency = invoice.currency;
  const layout = resolveLayout();
  const renderData = buildRenderData(invoice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/invoices"><ArrowLeft className="mr-1 h-4 w-4" /> Invoices</Link>
          </Button>
          <span className="text-muted hidden sm:inline">/</span>
          <span className="font-mono font-semibold text-foreground">{invoice.number}</span>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'draft' && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/app/invoices/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link>
              </Button>
              <Button size="sm" onClick={() => setSendConfirmOpen(true)}>
                <Send className="mr-2 h-4 w-4" /> Send
              </Button>
            </>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && remainingBalance > 0 && (
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} loading={pdfGenerating}>
            {!pdfGenerating && <Download className="mr-2 h-4 w-4" />}
            {pdfGenerating ? 'Preparing…' : 'PDF'}
          </Button>
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/invoice/${invoice.shareToken}`} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" /> Public View
            </a>
          </Button>
          {invoice.status === 'draft' && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-background p-6"
          >
            <h3 className="mb-4 font-semibold text-foreground">Timeline</h3>
            <div className="space-y-3">
              <TimelineItem icon={FileText} label="Created" date={invoice.createdAt} color="text-muted" done />
              {invoice.sentAt && <TimelineItem icon={Send} label="Sent" date={invoice.sentAt} color="text-warning" done />}
              {invoice.viewedAt && <TimelineItem icon={Eye} label="Viewed by client" date={invoice.viewedAt} color="text-accent" done />}
              {invoice.paidAt && <TimelineItem icon={CheckCircle} label="Paid" date={invoice.paidAt} color="text-success" done />}
              {invoice.status === 'overdue' && <TimelineItem icon={Clock} label="Overdue" date={invoice.dueDate} color="text-danger" done />}
            </div>
          </motion.div>

          {/* Payments */}
          {(invoice.payments ?? []).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <h3 className="mb-4 font-semibold text-foreground">Payments</h3>
              <div className="space-y-3">
                {(invoice.payments ?? []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium capitalize text-foreground">{p.method.replace(/_/g, ' ')}</p>
                      {p.notes && <p className="text-xs text-muted">{p.notes}</p>}
                      <p className="text-xs text-muted">
                        {new Date(p.paidAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <MoneyText amount={p.amount} currency={currency} className="font-semibold text-success" />
                  </div>
                ))}
              </div>
              {remainingBalance > 0 && (
                <div className="mt-3 flex justify-between text-sm font-medium">
                  <span className="text-muted">Remaining balance</span>
                  <MoneyText amount={remainingBalance} currency={currency} className="text-danger" />
                </div>
              )}
            </motion.div>
          )}

          {/* Invoice preview — uses the real template renderer */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <LiveInvoicePreview layout={layout} data={renderData} />
          </motion.div>
        </div>

        {/* Right sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 h-fit"
        >
          {/* Summary card */}
          <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Summary</h3>
            <div className="space-y-2 text-sm">
              <MetaRow label="Client" value={invoice.client?.name ?? '—'} />
              <MetaRow
                label="Issue Date"
                value={new Date(invoice.issueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
              <MetaRow
                label="Due Date"
                value={new Date(invoice.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
              <MetaRow label="Currency" value={<span className="font-mono text-xs">{currency}</span>} />
              <div className="border-t border-border pt-2">
                <MetaRow label="Subtotal" value={<MoneyText amount={invoice.subtotal} currency={currency} />} />
                {invoice.taxAmount > 0 && (
                  <MetaRow
                    label={`Tax (${invoice.taxRate / 100}%)`}
                    value={<MoneyText amount={invoice.taxAmount} currency={currency} />}
                  />
                )}
                {invoice.discountAmount > 0 && (
                  <MetaRow
                    label="Discount"
                    value={<span className="text-danger">− <MoneyText amount={invoice.discountAmount} currency={currency} /></span>}
                  />
                )}
                <MetaRow
                  label="Total"
                  value={<MoneyText amount={invoice.total} currency={currency} className="font-bold text-primary text-base" />}
                />
              </div>
              {invoice.amountPaid > 0 && (
                <div className="border-t border-border pt-2">
                  <MetaRow label="Paid" value={<MoneyText amount={invoice.amountPaid} currency={currency} className="text-success font-semibold" />} />
                  <MetaRow
                    label="Balance"
                    value={
                      <MoneyText
                        amount={remainingBalance}
                        currency={currency}
                        className={remainingBalance > 0 ? 'text-danger' : 'text-success'}
                      />
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Share link */}
          <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Share Link</h3>
            <p className="text-xs text-muted">Anyone with this link can view the invoice without logging in.</p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 text-xs font-mono text-muted break-all">
              /invoice/{invoice.shareToken.slice(0, 8)}…
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={copyShareLink}>
              <Copy className="mr-2 h-4 w-4" /> Copy Link
            </Button>
          </div>

          {/* QR Code */}
          <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">QR Code</h3>
              {!showQr && (
                <Button variant="ghost" size="sm" onClick={() => setShowQr(true)}>
                  <QrCode className="h-4 w-4 mr-1" /> Show
                </Button>
              )}
            </div>
            {showQr && (
              qrLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : qrError || !qrData?.qrDataUrl ? (
                <div className="flex flex-col items-center gap-3 py-3 text-center">
                  <AlertCircle className="h-8 w-8 text-danger/60" />
                  <p className="text-xs text-muted">Failed to load QR code.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchQr()}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <img src={qrData.qrDataUrl} alt="Invoice QR code" className="rounded-lg w-40 h-40 border border-border" />
                  <p className="text-xs text-muted-foreground text-center">Scan to view invoice</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = qrData.qrDataUrl;
                      a.download = `invoice-${invoice.number}-qr.png`;
                      a.click();
                    }}
                  >
                    <Download className="mr-2 h-3.5 w-3.5" /> Download QR
                  </Button>
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>

      <PaymentRecorder
        open={paymentOpen}
        invoice={invoice}
        onClose={() => {
          setPaymentOpen(false);
          qc.invalidateQueries({ queryKey: ['invoice', id] });
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Invoice?"
        description={`Invoice ${invoice.number} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <ConfirmDialog
        open={sendConfirmOpen}
        title="Send Invoice?"
        description={`Invoice ${invoice.number} will be sent to ${invoice.client?.name ?? 'the client'} and marked as Sent.`}
        confirmLabel="Send"
        variant="default"
        loading={sendMutation.isPending}
        onConfirm={() => { sendMutation.mutate(); setSendConfirmOpen(false); }}
        onCancel={() => setSendConfirmOpen(false)}
      />
    </div>
  );
}

function TimelineItem({ icon: Icon, label, date, color, done }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>; label: string; date: string; color: string; done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? 'bg-foreground/5' : 'bg-surface'}`}>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
        <span className="text-xs text-muted shrink-0">
          {new Date(date).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-0.5 gap-2">
      <span className="text-muted shrink-0">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
