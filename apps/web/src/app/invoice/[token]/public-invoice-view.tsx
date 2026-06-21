'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, Printer, CheckCircle2,
  Clock, AlertTriangle, QrCode,
} from 'lucide-react';
import { invoicesApi } from '@/lib/api/invoices';
import { StatusBadge } from '@/components/ui/status-badge';
import { MoneyText } from '@/components/ui/money-text';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@sterling/shared';

// ── QR Code (free public API — no extra npm package needed) ────────────────
function QrCodeImage({ url }: { url: string }) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&margin=2&color=3D52A0`;
  const [loaded, setLoaded] = React.useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[120px] h-[120px]">
        {!loaded && (
          <div className="absolute inset-0 rounded-lg bg-surface animate-pulse" />
        )}
        <img
          src={qrSrc}
          alt="QR code — scan to view this invoice"
          width={120}
          height={120}
          className="rounded-lg border border-border"
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
      </div>
      <p className="no-print text-[10px] text-muted-foreground text-center">Scan to view invoice</p>
    </div>
  );
}

export function PublicInvoiceView({ token }: { token: string }) {
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['public-invoice', token],
    queryFn: () => invoicesApi.getByShareToken(token),
    retry: false,
  });

  const [pageUrl, setPageUrl] = React.useState('');
  React.useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-danger/10 shadow-sm">
              <AlertCircle className="h-10 w-10 text-danger" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Invoice Not Found</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This invoice link is invalid or has been revoked. Please contact the sender for a new link.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
            If you believe this is an error, contact{' '}
            <span className="font-semibold text-primary">Sterling Support</span>.
          </div>
        </div>
      </div>
    );
  }

  const fmt = (n: number) => formatMoney(n, invoice.currency);
  const currency = invoice.currency;
  const remaining = invoice.total - invoice.amountPaid;

  // ── Status-specific banner ─────────────────────────────────────────────────
  function StatusBanner() {
    if (invoice!.status === 'paid') {
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success/10 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-success">This invoice has been paid. Thank you!</p>
            {invoice!.paidAt && (
              <p className="text-xs text-success/70 mt-0.5">
                Payment received on{' '}
                {new Date(invoice!.paidAt).toLocaleDateString('en-PK', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      );
    }
    if (invoice!.status === 'overdue') {
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-danger mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger">This invoice is overdue. Please contact us.</p>
            <p className="text-xs text-danger/70 mt-0.5">
              Payment was due on{' '}
              {new Date(invoice!.dueDate).toLocaleDateString('en-PK', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              {invoice!.client?.name
                ? `. Please contact ${invoice!.client.name} to arrange payment.`
                : '.'}
            </p>
          </div>
        </div>
      );
    }
    if (invoice!.status === 'sent') {
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4">
          <Clock className="h-5 w-5 shrink-0 text-accent mt-0.5" />
          <p className="text-sm font-semibold text-accent">
            Payment due by{' '}
            {new Date(invoice!.dueDate).toLocaleDateString('en-PK', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* ── Print stylesheet ──────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-card {
            box-shadow: none !important;
            border: 1px solid #ADBBDA !important;
          }
          .invoice-card * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="min-h-screen bg-surface py-8 px-4 print:bg-white print:py-0 print:px-0">
        <div className="mx-auto max-w-3xl space-y-5 print:max-w-none">

          {/* ── Top navigation bar (hidden in print) ───────────────────── */}
          <div className="no-print flex items-center justify-between">
            {/* Sterling brand mark */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white text-sm font-bold shadow-sm"
                style={{ background: 'linear-gradient(135deg, #3D52A0, #7091E6)' }}
              >
                S$
              </div>
              <div>
                <div className="font-bold text-foreground leading-tight">Sterling</div>
                <div className="text-[11px] text-muted-foreground">Invoice Platform</div>
              </div>
            </div>

            {/* Print action */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Print invoice"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>

          {/* ── Status banner ─────────────────────────────────────────────── */}
          <StatusBanner />

          {/* ── Main invoice card ──────────────────────────────────────────── */}
          <div className="invoice-card rounded-2xl border border-border bg-white shadow-sm overflow-hidden dark:bg-card">

            {/* Gradient header */}
            <div
              className="px-8 py-6 text-white"
              style={{ background: 'linear-gradient(135deg, #3D52A0 0%, #5468b8 100%)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold tracking-tight leading-none">Your Company</div>
                  <div className="text-sm text-white/60 mt-0.5">Issued via Sterling</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold tracking-tight opacity-90">INVOICE</div>
                  <div className="font-mono text-sm text-white/70 mt-0.5">{invoice.number}</div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">

              {/* Bill To + Invoice details */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Bill To
                  </p>
                  {invoice.client ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{invoice.client.name}</p>
                      {invoice.client.email && (
                        <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
                      )}
                      {invoice.client.billingAddress && (
                        <p className="text-sm text-muted-foreground">{invoice.client.billingAddress}</p>
                      )}
                      {(invoice.client.billingCity ?? invoice.client.billingCountry) && (
                        <p className="text-sm text-muted-foreground">
                          {[invoice.client.billingCity, invoice.client.billingCountry]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No client information</p>
                  )}
                </div>

                <div className="sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Invoice Details
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Invoice:{' '}
                      <span className="font-mono font-semibold text-foreground">{invoice.number}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Issue Date:{' '}
                      <span className="font-medium text-foreground">
                        {new Date(invoice.issueDate).toLocaleDateString('en-PK', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due Date:{' '}
                      <span className="font-medium text-foreground">
                        {new Date(invoice.dueDate).toLocaleDateString('en-PK', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </p>
                    <div className="mt-2 sm:flex sm:justify-end">
                      <StatusBadge status={invoice.status} />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              {/* Line items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: '#EDE8F5' }}>
                      <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-primary rounded-l-lg">
                        Description
                      </th>
                      <th className="text-right py-2.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-primary w-16">
                        Qty
                      </th>
                      <th className="text-right py-2.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-primary w-28">
                        Rate
                      </th>
                      <th className="text-right py-2.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-primary w-28 rounded-r-lg">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm italic">
                          No line items
                        </td>
                      </tr>
                    ) : (
                      (invoice.items ?? []).map((item, i) => (
                        <tr
                          key={item.id ?? i}
                          className="border-b border-border/40 last:border-0 hover:bg-surface/40 transition-colors"
                        >
                          <td className="py-3 px-3 text-foreground">{item.description}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-mono text-muted-foreground">
                            {fmt(item.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-mono font-medium text-foreground">
                            {fmt(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals block */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <MoneyText amount={invoice.subtotal} currency={currency} />
                  </div>
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({invoice.taxRate / 100}%)</span>
                      <MoneyText amount={invoice.taxAmount} currency={currency} />
                    </div>
                  )}
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-mono tabular-nums text-danger">
                        − {fmt(invoice.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-border pt-2 mt-1">
                    <div className="flex justify-between font-bold" style={{ color: '#3D52A0' }}>
                      <span className="text-base">Total</span>
                      <MoneyText amount={invoice.total} currency={currency} size="lg" className="font-bold" />
                    </div>
                  </div>
                  {invoice.amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-muted-foreground">Amount Paid</span>
                        <MoneyText
                          amount={invoice.amountPaid}
                          currency={currency}
                          className="text-success font-semibold"
                        />
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5">
                        <span className={remaining > 0 ? 'text-danger' : 'text-success'}>
                          {remaining > 0 ? 'Balance Due' : 'Fully Paid'}
                        </span>
                        <MoneyText
                          amount={remaining}
                          currency={currency}
                          className={remaining > 0 ? 'text-danger' : 'text-success'}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes + Terms */}
              {(invoice.notes || invoice.terms) && (
                <div className="grid gap-5 pt-2 border-t border-border sm:grid-cols-2">
                  {invoice.notes && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                        Notes
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {invoice.notes}
                      </p>
                    </div>
                  )}
                  {invoice.terms && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                        Terms &amp; Conditions
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {invoice.terms}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* QR code row */}
              {pageUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-5 pt-4 border-t border-border">
                  <div className="no-print flex items-center gap-1.5 text-muted-foreground self-start">
                    <QrCode className="h-4 w-4" />
                    <span className="text-xs font-medium">Share via QR</span>
                  </div>
                  <QrCodeImage url={pageUrl} />
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Scan the QR code to open or share this invoice on any device.
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/50 mt-1 break-all">
                      {pageUrl}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Card footer */}
            <div className="border-t border-border px-8 py-4 bg-surface/30 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Invoice <span className="font-mono font-medium">{invoice.number}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Powered by{' '}
                <span className="font-semibold text-primary">Sterling</span>
              </p>
            </div>
          </div>

          {/* Partial-pay summary (hidden in print) */}
          {invoice.amountPaid > 0 && (
            <div className="no-print rounded-2xl border border-border bg-background p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Payment Status</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invoice.amountPaid >= invoice.total
                    ? 'Fully paid'
                    : `${fmt(invoice.amountPaid)} of ${fmt(invoice.total)} paid`}
                </p>
              </div>
              <MoneyText
                amount={invoice.amountPaid}
                currency={currency}
                size="lg"
                className="font-bold text-success"
              />
            </div>
          )}

          {/* Page footer */}
          <p className="no-print text-center text-xs text-muted-foreground pb-6">
            This invoice was sent via{' '}
            <span className="font-semibold text-primary">Sterling</span>{' '}—
            Smart Invoice &amp; Payroll Platform
          </p>
        </div>
      </div>
    </>
  );
}
