'use client';

import * as React from 'react';
import type { TemplateLayout, TemplateBlock } from '@sterling/shared';
import { BLOCK_LABELS } from '@sterling/shared';
import { Settings } from 'lucide-react';

interface BlockInspectorProps {
  block: TemplateBlock | null;
  layout: TemplateLayout;
  onBlockChange: (blockId: string, settings: Record<string, unknown>) => void;
  onThemeChange: (theme: Partial<TemplateLayout['theme']>) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const uid = React.useId();
  const childWithId = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, { id: uid })
    : children;
  return (
    <div className="space-y-1">
      <label htmlFor={uid} className="block text-xs font-medium text-muted">{label}</label>
      {childWithId}
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors';
const checkCls = 'h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-border'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function BlockSettings({ block, onBlockChange }: { block: TemplateBlock; onBlockChange: BlockInspectorProps['onBlockChange'] }) {
  const s = block.settings;
  const set = (k: string, v: unknown) => onBlockChange(block.id, { ...s, [k]: v });

  switch (block.type) {
    case 'header':
      return (
        <div className="space-y-3">
          <Row label="Heading Text">
            <input className={inputCls} value={(s['title'] as string) ?? 'INVOICE'} onChange={(e) => set('title', e.target.value)} />
          </Row>
          <Row label="Layout">
            <select className={inputCls} value={(s['layout'] as string) ?? 'split'} onChange={(e) => set('layout', e.target.value)}>
              <option value="split">Split (company left, number right)</option>
              <option value="centered">Centered</option>
            </select>
          </Row>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Company Name</span>
            <Toggle checked={(s['showCompanyName'] as boolean) !== false} onChange={(v) => set('showCompanyName', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Invoice Number</span>
            <Toggle checked={(s['showInvoiceNumber'] as boolean) !== false} onChange={(v) => set('showInvoiceNumber', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Status Badge</span>
            <Toggle checked={(s['showStatus'] as boolean) !== false} onChange={(v) => set('showStatus', v)} />
          </div>
        </div>
      );

    case 'logo':
      return (
        <div className="space-y-3">
          <Row label="Alignment">
            <select className={inputCls} value={(s['alignment'] as string) ?? 'left'} onChange={(e) => set('alignment', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Row>
          <Row label={`Height: ${(s['height'] as number) ?? 60}px`}>
            <input
              type="range" min={30} max={120} step={10}
              value={(s['height'] as number) ?? 60}
              onChange={(e) => set('height', parseInt(e.target.value))}
              className="w-full accent-primary"
            />
          </Row>
          <p className="text-xs text-muted">Upload your logo in Company Settings. It will appear here automatically.</p>
        </div>
      );

    case 'divider':
      return (
        <div className="space-y-3">
          <Row label={`Thickness: ${(s['thickness'] as number) ?? 1}px`}>
            <input
              type="range" min={1} max={5} step={1}
              value={(s['thickness'] as number) ?? 1}
              onChange={(e) => set('thickness', parseInt(e.target.value))}
              className="w-full accent-primary"
            />
          </Row>
          <Row label="Style">
            <select className={inputCls} value={(s['style'] as string) ?? 'solid'} onChange={(e) => set('style', e.target.value)}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </Row>
          <Row label="Color (leave empty for theme default)">
            <input type="color" value={(s['color'] as string) || '#ADBBDA'} onChange={(e) => set('color', e.target.value)} className="h-8 w-full cursor-pointer rounded border border-border" />
          </Row>
        </div>
      );

    case 'client-info':
      return (
        <div className="space-y-3">
          <Row label="Section Label">
            <input className={inputCls} value={(s['label'] as string) ?? 'Bill To'} onChange={(e) => set('label', e.target.value)} />
          </Row>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Email</span>
            <Toggle checked={(s['showEmail'] as boolean) !== false} onChange={(v) => set('showEmail', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Phone</span>
            <Toggle checked={(s['showPhone'] as boolean) === true} onChange={(v) => set('showPhone', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Address</span>
            <Toggle checked={(s['showAddress'] as boolean) !== false} onChange={(v) => set('showAddress', v)} />
          </div>
        </div>
      );

    case 'invoice-meta':
      return (
        <div className="space-y-3">
          <Row label="Section Label">
            <input className={inputCls} value={(s['label'] as string) ?? 'Invoice Details'} onChange={(e) => set('label', e.target.value)} />
          </Row>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Issue Date</span>
            <Toggle checked={(s['showIssueDate'] as boolean) !== false} onChange={(v) => set('showIssueDate', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Due Date</span>
            <Toggle checked={(s['showDueDate'] as boolean) !== false} onChange={(v) => set('showDueDate', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Currency</span>
            <Toggle checked={(s['showCurrency'] as boolean) === true} onChange={(v) => set('showCurrency', v)} />
          </div>
        </div>
      );

    case 'items-table':
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Quantity Column</span>
            <Toggle checked={(s['showQty'] as boolean) !== false} onChange={(v) => set('showQty', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Unit Price Column</span>
            <Toggle checked={(s['showUnitPrice'] as boolean) !== false} onChange={(v) => set('showUnitPrice', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Alternate Row Colors</span>
            <Toggle checked={(s['alternateRows'] as boolean) !== false} onChange={(v) => set('alternateRows', v)} />
          </div>
          <Row label="Header Background">
            <input type="color" value={(s['headerBgColor'] as string) || '#3D52A0'} onChange={(e) => set('headerBgColor', e.target.value)} className="h-8 w-full cursor-pointer rounded border border-border" />
          </Row>
        </div>
      );

    case 'totals':
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Subtotal</span>
            <Toggle checked={(s['showSubtotal'] as boolean) !== false} onChange={(v) => set('showSubtotal', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Tax Row</span>
            <Toggle checked={(s['showTax'] as boolean) !== false} onChange={(v) => set('showTax', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Discount Row</span>
            <Toggle checked={(s['showDiscount'] as boolean) !== false} onChange={(v) => set('showDiscount', v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show Amount Paid</span>
            <Toggle checked={(s['showAmountPaid'] as boolean) !== false} onChange={(v) => set('showAmountPaid', v)} />
          </div>
        </div>
      );

    case 'notes':
      return (
        <div className="space-y-3">
          <Row label="Section Label">
            <input className={inputCls} value={(s['label'] as string) ?? 'Notes'} onChange={(e) => set('label', e.target.value)} />
          </Row>
          <Row label="Custom Text (overrides invoice notes)">
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Leave empty to show invoice notes…" value={(s['customText'] as string) ?? ''} onChange={(e) => set('customText', e.target.value)} />
          </Row>
        </div>
      );

    case 'terms':
      return (
        <div className="space-y-3">
          <Row label="Section Label">
            <input className={inputCls} value={(s['label'] as string) ?? 'Terms & Conditions'} onChange={(e) => set('label', e.target.value)} />
          </Row>
          <Row label="Custom Text (overrides invoice terms)">
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Leave empty to show invoice terms…" value={(s['customText'] as string) ?? ''} onChange={(e) => set('customText', e.target.value)} />
          </Row>
        </div>
      );

    case 'footer':
      return (
        <div className="space-y-3">
          <Row label="Footer Text">
            <input className={inputCls} value={(s['text'] as string) ?? 'Thank you for your business!'} onChange={(e) => set('text', e.target.value)} />
          </Row>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Show "Generated by Sterling"</span>
            <Toggle checked={(s['showBranding'] as boolean) !== false} onChange={(v) => set('showBranding', v)} />
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-3">
          <Row label={`Height: ${(s['height'] as number) ?? 24}px`}>
            <input
              type="range" min={4} max={80} step={4}
              value={(s['height'] as number) ?? 24}
              onChange={(e) => set('height', parseInt(e.target.value))}
              className="w-full accent-primary"
            />
          </Row>
        </div>
      );

    default:
      return <p className="text-xs text-muted">No settings for this block.</p>;
  }
}

const FONT_OPTIONS = [
  { value: 'system', label: 'System Sans' },
  { value: 'arial', label: 'Arial' },
  { value: 'georgia', label: 'Georgia (Serif)' },
  { value: 'courier', label: 'Courier (Mono)' },
];

function ThemeSettings({ theme, onThemeChange }: { theme: TemplateLayout['theme']; onThemeChange: BlockInspectorProps['onThemeChange'] }) {
  return (
    <div className="space-y-4">
      <Row label="Primary Color">
        <div className="flex items-center gap-2">
          <input type="color" value={theme.primaryColor} onChange={(e) => onThemeChange({ primaryColor: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-border" />
          <input className={inputCls} value={theme.primaryColor} onChange={(e) => onThemeChange({ primaryColor: e.target.value })} placeholder="#3D52A0" />
        </div>
      </Row>
      <Row label="Text Color">
        <div className="flex items-center gap-2">
          <input type="color" value={theme.textColor} onChange={(e) => onThemeChange({ textColor: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-border" />
          <input className={inputCls} value={theme.textColor} onChange={(e) => onThemeChange({ textColor: e.target.value })} placeholder="#1a1a2e" />
        </div>
      </Row>
      <Row label="Muted / Label Color">
        <div className="flex items-center gap-2">
          <input type="color" value={theme.mutedColor} onChange={(e) => onThemeChange({ mutedColor: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-border" />
          <input className={inputCls} value={theme.mutedColor} onChange={(e) => onThemeChange({ mutedColor: e.target.value })} placeholder="#8697C4" />
        </div>
      </Row>
      <Row label="Border Color">
        <div className="flex items-center gap-2">
          <input type="color" value={theme.borderColor} onChange={(e) => onThemeChange({ borderColor: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-border" />
          <input className={inputCls} value={theme.borderColor} onChange={(e) => onThemeChange({ borderColor: e.target.value })} placeholder="#ADBBDA" />
        </div>
      </Row>
      <Row label="Font Family">
        <select className={inputCls} value={theme.fontFamily} onChange={(e) => onThemeChange({ fontFamily: e.target.value })}>
          {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </Row>
      <Row label="Paper Size">
        <select className={inputCls} value={theme.paperSize} onChange={(e) => onThemeChange({ paperSize: e.target.value as TemplateLayout['theme']['paperSize'] })}>
          <option value="A4">A4 (210 × 297mm)</option>
          <option value="Letter">Letter (216 × 279mm)</option>
          <option value="A5">A5 (148 × 210mm)</option>
        </select>
      </Row>
      {/* Preset themes */}
      <div>
        <label className="block text-xs font-medium text-muted mb-2">Presets</label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Sterling', color: '#3D52A0' },
            { label: 'Midnight', color: '#1a1a2e' },
            { label: 'Minimal', color: '#374151' },
            { label: 'Emerald', color: '#2E9E7B' },
          ].map((p) => (
            <button
              key={p.label}
              title={p.label}
              onClick={() => onThemeChange({ primaryColor: p.color })}
              style={{ background: p.color }}
              className="h-7 rounded-md border border-transparent hover:border-white/50 transition-all hover:scale-105"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BlockInspector({ block, layout, onBlockChange, onThemeChange }: BlockInspectorProps) {
  const [tab, setTab] = React.useState<'block' | 'theme'>('block');

  React.useEffect(() => {
    if (block) setTab('block');
  }, [block?.id]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setTab('block')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${tab === 'block' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-foreground'}`}
        >
          Block
        </button>
        <button
          onClick={() => setTab('theme')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${tab === 'theme' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-foreground'}`}
        >
          Theme
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'theme' ? (
          <ThemeSettings theme={layout.theme} onThemeChange={onThemeChange} />
        ) : block ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Settings className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">{BLOCK_LABELS[block.type]}</span>
            </div>
            <BlockSettings block={block} onBlockChange={onBlockChange} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Settings className="h-8 w-8 text-border mb-2" />
            <p className="text-xs text-muted">Select a block to edit its settings</p>
          </div>
        )}
      </div>
    </div>
  );
}
