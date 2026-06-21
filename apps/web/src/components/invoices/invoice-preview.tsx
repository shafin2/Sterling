'use client';

import { formatMoney } from '@sterling/shared';
import { StatusBadge } from '@/components/ui/status-badge';

interface PreviewClient {
  name: string;
  email?: string;
  billingAddress?: string;
  billingCity?: string;
  billingCountry?: string;
}

interface PreviewItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface TemplateTheme {
  primaryColor: string;
  accentColor?: string;
}

interface InvoicePreviewProps {
  number: string;
  client: PreviewClient | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  items: PreviewItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  notes?: string;
  terms?: string;
  status: string;
  companyName?: string;
  logoUrl?: string | null;
  templateTheme?: TemplateTheme;
}

export function InvoicePreview({
  number, client, issueDate, dueDate, currency,
  items, subtotal, taxRate, taxAmount, discountAmount, total,
  notes, terms, status, companyName = 'Your Company',
  logoUrl, templateTheme,
}: InvoicePreviewProps) {
  const fmt = (n: number) => formatMoney(n, currency);
  const headerBg = templateTheme?.primaryColor ?? '#3D52A0';
  const accentBg = templateTheme?.accentColor ?? '#EDE8F5';

  return (
    <div className="rounded-xl border border-border bg-white text-gray-800 shadow-sm overflow-hidden text-[11px]">
      {/* Header */}
      <div className="px-5 py-4 text-white" style={{ backgroundColor: headerBg }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-10 max-w-[120px] object-contain mb-1 brightness-0 invert" />
            ) : (
              <div className="text-lg font-bold tracking-tight">{companyName}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold tracking-tight opacity-90">INVOICE</div>
            <div className="font-mono text-xs opacity-70 mt-0.5">{number}</div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Meta */}
        <div className="flex justify-between gap-4">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Bill To</div>
            {client ? (
              <div>
                <div className="font-semibold text-gray-800">{client.name}</div>
                {client.email && <div className="text-gray-500">{client.email}</div>}
                {client.billingAddress && <div className="text-gray-500">{client.billingAddress}</div>}
                {(client.billingCity || client.billingCountry) && (
                  <div className="text-gray-500">
                    {[client.billingCity, client.billingCountry].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 italic">No client selected</div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Details</div>
            <div className="text-gray-600">Issue: <span className="font-medium text-gray-800">{issueDate || '—'}</span></div>
            <div className="text-gray-600">Due: <span className="font-medium text-gray-800">{dueDate || '—'}</span></div>
            <div className="mt-1">
              <StatusBadge status={status} />
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: accentBg }}>
              <th className="py-1.5 px-2 text-left text-[9px] font-semibold uppercase tracking-wide" style={{ color: headerBg }}>Description</th>
              <th className="py-1.5 px-2 text-right text-[9px] font-semibold uppercase tracking-wide" style={{ color: headerBg }}>Qty</th>
              <th className="py-1.5 px-2 text-right text-[9px] font-semibold uppercase tracking-wide" style={{ color: headerBg }}>Price</th>
              <th className="py-1.5 px-2 text-right text-[9px] font-semibold uppercase tracking-wide" style={{ color: headerBg }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 px-2 text-center text-gray-400 italic">No items added yet</td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 px-2 text-gray-700">{item.description || <span className="text-gray-400 italic">Description</span>}</td>
                  <td className="py-1.5 px-2 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-gray-600">{fmt(item.unitPrice)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-gray-800">{fmt(item.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto w-44 space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-mono">{fmt(subtotal)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax ({taxRate}%)</span>
              <span className="font-mono">{fmt(taxAmount)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span className="font-mono">− {fmt(discountAmount)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-1 flex justify-between font-bold" style={{ color: headerBg }}>
            <span>Total</span>
            <span className="font-mono">{fmt(total)}</span>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Notes</div>
            <p className="text-gray-600 leading-relaxed">{notes}</p>
          </div>
        )}
        {terms && (
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Terms</div>
            <p className="text-gray-600 leading-relaxed">{terms}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 py-2 text-center text-[9px] text-gray-400">
        Generated by Sterling — Invoice & Payroll Platform
      </div>
    </div>
  );
}
