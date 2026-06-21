'use client';

import * as React from 'react';
import { renderInvoiceToHtml, type TemplateLayout, type InvoiceRenderData } from '@sterling/shared';

interface LiveInvoicePreviewProps {
  layout: TemplateLayout;
  data: InvoiceRenderData;
}

const PAPER_WIDTHS: Record<string, number> = { A4: 794, Letter: 816, A5: 559 };
const PAPER_HEIGHTS: Record<string, number> = { A4: 1123, Letter: 1056, A5: 794 };

export function LiveInvoicePreview({ layout, data }: LiveInvoicePreviewProps) {
  const [srcDoc, setSrcDoc] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSrcDoc(renderInvoiceToHtml(layout, data));
    }, 200);
    return () => clearTimeout(timer);
    // Stringify data so the effect re-runs when any invoice field changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, JSON.stringify(data)]);

  const paperWidth = PAPER_WIDTHS[layout.theme.paperSize] ?? 794;
  const paperHeight = PAPER_HEIGHTS[layout.theme.paperSize] ?? 1123;
  const zoom = 0.52; // fits comfortably in the 420px sidebar

  return (
    <div
      style={{ width: paperWidth * zoom, height: paperHeight * zoom }}
      className="overflow-hidden rounded-lg shadow-md shrink-0"
    >
      <iframe
        srcDoc={srcDoc}
        style={{
          width: paperWidth,
          height: paperHeight,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          border: 'none',
          background: '#fff',
          pointerEvents: 'none',
        }}
        title="Invoice Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
