'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into `document.body` so fixed overlays (drawers, modals)
 * escape the app-shell stacking context. The topbar uses `backdrop-blur`
 * (a stacking context) which otherwise paints over in-page `z-40` backdrops,
 * leaving the header strip un-dimmed. Portaling to body fixes that everywhere.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
