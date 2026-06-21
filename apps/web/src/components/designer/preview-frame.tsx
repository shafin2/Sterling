'use client';

import * as React from 'react';
import { renderInvoiceToHtml, SAMPLE_INVOICE_DATA, type TemplateLayout } from '@sterling/shared';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewFrameProps {
  layout: TemplateLayout;
  className?: string;
  logoUrl?: string | null;
}

type DeviceMode = 'desktop' | 'mobile';

const PAPER_WIDTHS: Record<string, number> = { A4: 794, Letter: 816, A5: 559 };
const PAPER_HEIGHTS: Record<string, number> = { A4: 1123, Letter: 1056, A5: 794 };

export function PreviewFrame({ layout, className, logoUrl }: PreviewFrameProps) {
  const [device, setDevice] = React.useState<DeviceMode>('desktop');
  const [zoom, setZoom] = React.useState(0.75);
  const [srcDoc, setSrcDoc] = React.useState('');
  const frameRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSrcDoc(renderInvoiceToHtml(layout, { ...SAMPLE_INVOICE_DATA, logoUrl: logoUrl ?? undefined }));
    }, 250);
    return () => clearTimeout(timer);
  }, [layout, logoUrl]);

  const paperWidth = PAPER_WIDTHS[layout.theme.paperSize] ?? 794;
  const paperHeight = PAPER_HEIGHTS[layout.theme.paperSize] ?? 1123;
  const displayWidth = device === 'mobile' ? 375 : paperWidth;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2 shrink-0">
        <span className="text-xs font-medium text-muted">Live Preview</span>
        <div className="flex items-center gap-3">
          {/* Device toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setDevice('desktop')}
              className={cn('p-1.5 transition-colors', device === 'desktop' ? 'bg-primary text-white' : 'text-muted hover:bg-surface')}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={cn('p-1.5 transition-colors', device === 'mobile' ? 'bg-primary text-white' : 'text-muted hover:bg-surface')}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Zoom */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
              className="text-xs font-mono w-6 h-6 flex items-center justify-center rounded border border-border text-muted hover:bg-surface transition-colors"
            >−</button>
            <span className="text-xs text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              className="text-xs font-mono w-6 h-6 flex items-center justify-center rounded border border-border text-muted hover:bg-surface transition-colors"
            >+</button>
          </div>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-zinc-100 p-6 flex justify-center">
        <div
          style={{
            width: displayWidth * zoom,
            height: paperHeight * zoom,
          }}
          className="shadow-2xl"
        >
          <iframe
            ref={frameRef}
            srcDoc={srcDoc}
            style={{ width: displayWidth, height: paperHeight, transform: `scale(${zoom})`, transformOrigin: 'top left', border: 'none', background: '#fff' }}
            title="Invoice Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
