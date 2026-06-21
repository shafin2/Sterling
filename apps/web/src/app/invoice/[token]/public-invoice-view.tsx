'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { invoicesApi } from '@/lib/api/invoices';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MoneyText } from '@/components/ui/money-text';
import { Skeleton } from '@/components/ui/skeleton';

export function PublicInvoiceView({ token }: { token: string }) {
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['public-invoice', token],
    queryFn: () => invoicesApi.getByShareToken(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
              <AlertCircle className="h-8 w-8 text-danger" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground">Invoice Not Found</h1>
          <p className="text-muted-foreground">This invoice link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-foreground">Sterling</div>
              <div className="text-xs text-muted-foreground">Invoice Platform</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Invoice preview */}
        <InvoicePreview
          number={invoice.number}
          client={invoice.client ?? null}
          issueDate={invoice.issueDate}
          dueDate={invoice.dueDate}
          currency={invoice.currency}
          items={(invoice.items ?? []).map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.amount,
          }))}
          subtotal={invoice.subtotal}
          taxRate={invoice.taxRate / 100}
          taxAmount={invoice.taxAmount}
          discountAmount={invoice.discountAmount}
          total={invoice.total}
          notes={invoice.notes}
          terms={invoice.terms}
          status={invoice.status}
        />

        {/* Payment summary (if partially/fully paid) */}
        {invoice.amountPaid > 0 && (
          <div className="rounded-2xl border border-border bg-background p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Payment Status</p>
              <p className="text-xs text-muted-foreground">
                {invoice.amountPaid >= invoice.total ? 'Fully paid' : 'Partially paid'}
              </p>
            </div>
            <div className="text-right">
              <MoneyText
                amount={invoice.amountPaid}
                currency={invoice.currency}
                className="font-bold text-success"
              />
              {invoice.amountPaid < invoice.total && (
                <p className="text-xs text-muted-foreground">
                  of <MoneyText amount={invoice.total} currency={invoice.currency} />
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          This invoice was sent via{' '}
          <span className="font-semibold text-primary">Sterling</span> —
          Smart Invoice & Payroll Platform
        </p>
      </div>
    </div>
  );
}
