import type { TemplateLayout, TemplateBlock, InvoiceRenderData } from '../types/template.js';
import { getFontStack } from '../types/template.js';

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(major);
  } catch {
    return major.toFixed(2);
  }
}

function statusBadge(status: string, primary: string): string {
  const map: Record<string, { bg: string; color: string }> = {
    draft: { bg: '#EDE8F5', color: '#8697C4' },
    sent: { bg: '#FEF3C7', color: '#D99A4E' },
    paid: { bg: '#D1FAE5', color: '#2E9E7B' },
    overdue: { bg: '#FEE2E2', color: '#C9485B' },
  };
  const s = map[status] ?? { bg: '#F3F4F6', color: '#6B7280' };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;background:${s.bg};color:${s.color}">${esc(status)}</span>`;
}

function renderBlock(block: TemplateBlock, data: InvoiceRenderData, theme: TemplateLayout['theme']): string {
  const { type, settings } = block;
  const s = settings as Record<string, unknown>;
  const primary = theme.primaryColor;
  const muted = theme.mutedColor;
  const border = theme.borderColor;
  const cur = data.currency;

  switch (type) {
    case 'header': {
      const title = (s['title'] as string) ?? 'INVOICE';
      const showCompany = s['showCompanyName'] !== false;
      const showNumber = s['showInvoiceNumber'] !== false;
      const showStatus = s['showStatus'] !== false;
      const layout = (s['layout'] as string) ?? 'split';
      const isCentered = layout === 'centered';

      const left = showCompany
        ? `<div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">${esc(data.companyName ?? 'Your Company')}</div>`
        : '';
      const right = `
        <div style="text-align:right">
          <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px;opacity:.95">${esc(title)}</div>
          ${showNumber ? `<div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:2px;font-family:monospace">${esc(data.number)}</div>` : ''}
          ${showStatus ? `<div style="margin-top:8px">${statusBadge(data.status, primary)}</div>` : ''}
        </div>`;

      if (isCentered) {
        return `<div style="background:${primary};padding:32px 40px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:#fff;opacity:.95">${esc(title)}</div>
          ${showCompany ? `<div style="font-size:14px;color:rgba(255,255,255,.7);margin-top:4px">${esc(data.companyName ?? '')}</div>` : ''}
          ${showNumber ? `<div style="font-size:12px;color:rgba(255,255,255,.6);font-family:monospace;margin-top:6px">${esc(data.number)}</div>` : ''}
          ${showStatus ? `<div style="margin-top:10px">${statusBadge(data.status, primary)}</div>` : ''}
        </div>`;
      }

      return `<div style="background:${primary};padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>${left}</div>
        ${right}
      </div>`;
    }

    case 'logo': {
      if (!data.logoUrl) return '';
      const align = (s['alignment'] as string) ?? 'left';
      const height = (s['height'] as number) ?? 60;
      const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
      return `<div style="padding:20px 40px;display:flex;justify-content:${justifyMap[align] ?? 'flex-start'}">
        <img src="${esc(data.logoUrl)}" alt="Logo" style="height:${height}px;max-width:200px;object-fit:contain" />
      </div>`;
    }

    case 'divider': {
      const thickness = (s['thickness'] as number) ?? 1;
      const color = (s['color'] as string) || border;
      const style = (s['style'] as string) ?? 'solid';
      return `<div style="padding:0 40px"><hr style="border:none;border-top:${thickness}px ${style} ${color};margin:0" /></div>`;
    }

    case 'client-info': {
      const label = (s['label'] as string) ?? 'Bill To';
      const showEmail = s['showEmail'] !== false;
      const showPhone = (s['showPhone'] as boolean) === true;
      const showAddress = s['showAddress'] !== false;
      const c = data.client;
      return `<div style="padding:0 40px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${muted};margin-bottom:6px">${esc(label)}</div>
        ${c
          ? `<div style="font-size:14px;font-weight:600;color:${theme.textColor}">${esc(c.name)}</div>
             ${showEmail && c.email ? `<div style="font-size:12px;color:${muted};margin-top:2px">${esc(c.email)}</div>` : ''}
             ${showPhone && c.phone ? `<div style="font-size:12px;color:${muted}">${esc(c.phone)}</div>` : ''}
             ${showAddress && c.billingAddress ? `<div style="font-size:12px;color:${muted};margin-top:2px">${esc(c.billingAddress)}</div>` : ''}
             ${showAddress && (c.billingCity || c.billingCountry) ? `<div style="font-size:12px;color:${muted}">${esc([c.billingCity, c.billingCountry].filter(Boolean).join(', '))}</div>` : ''}`
          : `<div style="font-size:12px;color:${muted};font-style:italic">No client selected</div>`}
      </div>`;
    }

    case 'invoice-meta': {
      const showIssue = s['showIssueDate'] !== false;
      const showDue = s['showDueDate'] !== false;
      const showCurrency = (s['showCurrency'] as boolean) === true;
      const label = (s['label'] as string) ?? 'Invoice Details';
      return `<div style="padding:0 40px;text-align:right">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${muted};margin-bottom:6px">${esc(label)}</div>
        ${showIssue ? `<div style="font-size:12px;color:${muted}">Issue Date: <span style="font-weight:600;color:${theme.textColor}">${esc(data.issueDate)}</span></div>` : ''}
        ${showDue ? `<div style="font-size:12px;color:${muted}">Due Date: <span style="font-weight:600;color:${theme.textColor}">${esc(data.dueDate)}</span></div>` : ''}
        ${showCurrency ? `<div style="font-size:12px;color:${muted}">Currency: <span style="font-weight:600;color:${theme.textColor}">${esc(data.currency)}</span></div>` : ''}
      </div>`;
    }

    case 'items-table': {
      const showQty = s['showQty'] !== false;
      const showUnit = s['showUnitPrice'] !== false;
      const alternate = s['alternateRows'] !== false;
      const headerBg = (s['headerBgColor'] as string) || primary;

      const headerStyle = `padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#fff`;
      const rows = data.items.map((item, i) => {
        const rowBg = alternate && i % 2 === 1 ? 'background:#F9FAFB' : '';
        return `<tr style="${rowBg}">
          <td style="padding:10px 12px;border-bottom:1px solid ${border};font-size:13px;color:${theme.textColor}">${esc(item.description)}</td>
          ${showQty ? `<td style="padding:10px 12px;border-bottom:1px solid ${border};text-align:right;font-size:13px;color:${muted}">${item.quantity}</td>` : ''}
          ${showUnit ? `<td style="padding:10px 12px;border-bottom:1px solid ${border};text-align:right;font-size:13px;font-family:monospace;color:${muted}">${cur} ${fmt(item.unitPrice, cur)}</td>` : ''}
          <td style="padding:10px 12px;border-bottom:1px solid ${border};text-align:right;font-size:13px;font-family:monospace;font-weight:600;color:${theme.textColor}">${cur} ${fmt(item.amount, cur)}</td>
        </tr>`;
      }).join('');

      return `<div style="padding:0 40px">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:${headerBg}">
              <th style="${headerStyle}">Description</th>
              ${showQty ? `<th style="${headerStyle};text-align:right">Qty</th>` : ''}
              ${showUnit ? `<th style="${headerStyle};text-align:right">Unit Price</th>` : ''}
              <th style="${headerStyle};text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" style="padding:16px 12px;text-align:center;font-style:italic;color:${muted}">No items</td></tr>`}
          </tbody>
        </table>
      </div>`;
    }

    case 'totals': {
      const showSubtotal = s['showSubtotal'] !== false;
      const showTax = s['showTax'] !== false;
      const showDiscount = s['showDiscount'] !== false;
      const showAmountPaid = s['showAmountPaid'] !== false;

      const rowStyle = `display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${border};font-size:13px`;

      return `<div style="padding:0 40px">
        <div style="margin-left:auto;width:260px">
          ${showSubtotal ? `<div style="${rowStyle}"><span style="color:${muted}">Subtotal</span><span style="font-family:monospace;color:${theme.textColor}">${cur} ${fmt(data.subtotal, cur)}</span></div>` : ''}
          ${showTax && data.taxAmount > 0 ? `<div style="${rowStyle}"><span style="color:${muted}">Tax (${data.taxRate / 100}%)</span><span style="font-family:monospace;color:${theme.textColor}">${cur} ${fmt(data.taxAmount, cur)}</span></div>` : ''}
          ${showDiscount && data.discountAmount > 0 ? `<div style="${rowStyle}"><span style="color:${muted}">Discount</span><span style="font-family:monospace;color:#C9485B">− ${cur} ${fmt(data.discountAmount, cur)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:10px 0 5px;font-size:16px;font-weight:700;color:${primary}">
            <span>Total</span><span style="font-family:monospace">${cur} ${fmt(data.total, cur)}</span>
          </div>
          ${showAmountPaid && data.amountPaid > 0 ? `<div style="${rowStyle};color:#2E9E7B;border-top:1px solid ${border};padding-top:8px"><span>Amount Paid</span><span style="font-family:monospace">${cur} ${fmt(data.amountPaid, cur)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;font-weight:600;color:${data.total - data.amountPaid > 0 ? '#C9485B' : '#2E9E7B'}">
            <span>Balance Due</span><span style="font-family:monospace">${cur} ${fmt(data.total - data.amountPaid, cur)}</span>
          </div>` : ''}
        </div>
      </div>`;
    }

    case 'notes': {
      const label = (s['label'] as string) ?? 'Notes';
      const customText = (s['customText'] as string) || '';
      const text = customText || data.notes;
      if (!text) return '';
      return `<div style="padding:0 40px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${muted};margin-bottom:6px">${esc(label)}</div>
        <p style="font-size:12px;color:${theme.textColor};line-height:1.6;white-space:pre-wrap">${esc(text)}</p>
      </div>`;
    }

    case 'terms': {
      const label = (s['label'] as string) ?? 'Terms & Conditions';
      const customText = (s['customText'] as string) || '';
      const text = customText || data.terms;
      if (!text) return '';
      return `<div style="padding:0 40px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${muted};margin-bottom:6px">${esc(label)}</div>
        <p style="font-size:12px;color:${theme.textColor};line-height:1.6;white-space:pre-wrap">${esc(text)}</p>
      </div>`;
    }

    case 'footer': {
      const text = (s['text'] as string) ?? 'Thank you for your business!';
      const showBranding = s['showBranding'] !== false;
      return `<div style="border-top:1px solid ${border};padding:16px 40px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:${muted}">${esc(text)}</span>
        ${showBranding ? `<span style="font-size:10px;color:${border}">Generated by Sterling</span>` : ''}
      </div>`;
    }

    case 'spacer': {
      const height = (s['height'] as number) ?? 24;
      return `<div style="height:${height}px"></div>`;
    }

    default:
      return '';
  }
}

const PAPER_WIDTHS = { A4: '794px', Letter: '816px', A5: '559px' };

export function renderInvoiceToHtml(layout: TemplateLayout, data: InvoiceRenderData): string {
  const { theme, blocks } = layout;
  const fontStack = getFontStack(theme.fontFamily);
  const paperWidth = PAPER_WIDTHS[theme.paperSize] ?? '794px';

  const bodyBlocks: string[] = [];

  // Group client-info + invoice-meta side by side if both are visible
  const processedIds = new Set<string>();
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (processedIds.has(block.id)) continue;
    if (!block.visible) continue;

    if (block.type === 'client-info') {
      const nextVisible = blocks.slice(i + 1).find((b) => b.visible && !processedIds.has(b.id));
      if (nextVisible?.type === 'invoice-meta') {
        processedIds.add(block.id);
        processedIds.add(nextVisible.id);
        const left = renderBlock({ ...block, settings: block.settings }, data, theme)
          .replace(/padding:0 40px/, 'padding:0').replace(/text-align:right/, '');
        const right = renderBlock({ ...nextVisible, settings: nextVisible.settings }, data, theme)
          .replace(/padding:0 40px/, 'padding:0');
        bodyBlocks.push(`<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:24px 40px;gap:24px">
          <div style="flex:1">${left}</div>
          <div style="flex:1">${right}</div>
        </div>`);
        continue;
      }
    }

    if (block.type === 'invoice-meta') {
      const prevBlock = blocks.slice(0, i).reverse().find((b) => b.visible);
      if (prevBlock?.type === 'client-info' && processedIds.has(prevBlock.id)) {
        processedIds.add(block.id);
        continue;
      }
    }

    processedIds.add(block.id);
    const rendered = renderBlock(block, data, theme);
    if (rendered) {
      // Add padding between blocks (except header and footer)
      const needsPadding = !['header', 'footer', 'divider', 'logo'].includes(block.type);
      const wrapped = needsPadding
        ? `<div style="padding:16px 0">${rendered}</div>`
        : rendered;
      bodyBlocks.push(wrapped);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: ${fontStack};
    font-size: 13px;
    color: ${theme.textColor};
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .invoice-page {
    width: ${paperWidth};
    max-width: 100%;
    margin: 0 auto;
    background: #fff;
    min-height: 100vh;
  }
  @media print {
    body { margin: 0; }
    .invoice-page { width: 100%; }
  }
</style>
</head>
<body>
<div class="invoice-page">
  ${bodyBlocks.join('\n')}
</div>
</body>
</html>`;
}

export const SAMPLE_INVOICE_DATA: InvoiceRenderData = {
  number: 'INV-0001',
  issueDate: '2026-01-15',
  dueDate: '2026-02-15',
  currency: 'PKR',
  status: 'sent',
  subtotal: 450000,
  taxRate: 1700,
  taxAmount: 76500,
  discountAmount: 0,
  total: 526500,
  amountPaid: 0,
  notes: 'Payment is due within 30 days.',
  terms: 'Late payments are subject to a 1.5% monthly fee.',
  companyName: 'Acme Corporation',
  client: {
    name: 'Muhammad Ali Khan',
    email: 'ali.khan@example.com',
    phone: '+92 300 1234567',
    billingAddress: '123 Main Street, Suite 5',
    billingCity: 'Lahore',
    billingCountry: 'Pakistan',
  },
  items: [
    { description: 'Website Design & Development', quantity: 1, unitPrice: 250000, amount: 250000 },
    { description: 'SEO Optimization (monthly)', quantity: 2, unitPrice: 75000, amount: 150000 },
    { description: 'Content Writing', quantity: 5, unitPrice: 10000, amount: 50000 },
  ],
};
