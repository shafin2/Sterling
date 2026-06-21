'use client';

import * as React from 'react';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Undo2, Redo2,
  LayoutTemplate, SlidersHorizontal, X,
} from 'lucide-react';
import { templatesApi } from '@/lib/api/templates';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TemplateCanvas } from '@/components/designer/template-canvas';
import { BlockInspector } from '@/components/designer/block-inspector';
import { PreviewFrame } from '@/components/designer/preview-frame';
import { cn } from '@/lib/utils';
import type { TemplateLayout } from '@sterling/shared';

export default function DesignerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => templatesApi.get(id),
  });

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get('tenants/me').json<{ logo: string | null }>(),
  });

  const [layout, setLayout] = React.useState<TemplateLayout | null>(null);
  const [past, setPast] = React.useState<TemplateLayout[]>([]);
  const [future, setFuture] = React.useState<TemplateLayout[]>([]);
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);

  // Mobile panel drawers
  const [leftOpen, setLeftOpen] = React.useState(false);
  const [rightOpen, setRightOpen] = React.useState(false);

  // Navigation guard
  const [backConfirmOpen, setBackConfirmOpen] = React.useState(false);

  // Initialise layout once template loads
  React.useEffect(() => {
    if (template && !layout) {
      setLayout(template.layout);
    }
  }, [template]); // eslint-disable-line react-hooks/exhaustive-deps

  // beforeunload guard for browser back/refresh
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Keyboard shortcuts
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (isDirty && layout) save.mutate(layout); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [past, future, layout, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (newLayout: TemplateLayout) => templatesApi.update(id, { layout: newLayout }),
    onSuccess: () => {
      toast.success('Template saved');
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['template', id] });
    },
    onError: () => toast.error('Failed to save template'),
  });

  function update(newLayout: TemplateLayout) {
    if (!layout) return;
    setPast((p) => [...p.slice(-30), layout]);
    setFuture([]);
    setLayout(newLayout);
    setIsDirty(true);
  }

  function undo() {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture((f) => [layout!, ...f]);
    setPast((p) => p.slice(0, -1));
    setLayout(prev);
    setIsDirty(true);
  }

  function redo() {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, layout!]);
    setFuture((f) => f.slice(1));
    setLayout(next);
    setIsDirty(true);
  }

  function handleBlockChange(blockId: string, settings: Record<string, unknown>) {
    if (!layout) return;
    update({
      ...layout,
      blocks: layout.blocks.map((b) => (b.id === blockId ? { ...b, settings } : b)),
    });
  }

  function handleThemeChange(themePartial: Partial<TemplateLayout['theme']>) {
    if (!layout) return;
    update({ ...layout, theme: { ...layout.theme, ...themePartial } });
  }

  function handleBack() {
    if (isDirty) { setBackConfirmOpen(true); } else { router.push('/app/designer'); }
  }

  const selectedBlock = layout?.blocks.find((b) => b.id === selectedBlockId) ?? null;

  if (isLoading || !layout) {
    return (
      <div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <Skeleton className="hidden lg:block w-56 border-r border-border" />
          <div className="flex-1 p-8"><Skeleton className="h-full rounded-2xl" /></div>
          <Skeleton className="hidden lg:block w-72 border-l border-border" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden -m-6" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between border-b border-border bg-background px-3 py-2 shrink-0 z-10 gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile: blocks toggle */}
            <button
              onClick={() => { setLeftOpen(true); setRightOpen(false); }}
              className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface hover:text-foreground transition-colors shrink-0"
              title="Blocks"
            >
              <LayoutTemplate className="h-4 w-4" />
            </button>

            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <span className="text-muted hidden sm:inline">/</span>
            <span className="text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-[200px] hidden sm:block">
              {template?.name}
            </span>
            {isDirty && (
              <span className="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded shrink-0">
                Unsaved
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)" className="hidden sm:flex">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)" className="hidden sm:flex">
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              disabled={!isDirty}
              loading={save.isPending}
              onClick={() => save.mutate(layout)}
            >
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Save{isDirty ? ' ·' : ''}</span>
            </Button>

            {/* Mobile: inspector toggle */}
            <button
              onClick={() => { setRightOpen(true); setLeftOpen(false); }}
              className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface hover:text-foreground transition-colors"
              title="Inspector"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* 3-panel layout */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile overlay */}
          <AnimatePresence>
            {(leftOpen || rightOpen) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                onClick={() => { setLeftOpen(false); setRightOpen(false); }}
              />
            )}
          </AnimatePresence>

          {/* Left: Block canvas — desktop static, mobile drawer */}
          <aside
            className={cn(
              'shrink-0 border-r border-border bg-background flex flex-col z-40 transition-transform duration-300',
              // Desktop: always visible, fixed width
              'lg:relative lg:translate-x-0 lg:w-56',
              // Mobile: absolute drawer
              'fixed top-0 bottom-0 left-0 w-72',
              leftOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            )}
          >
            {/* Mobile drawer header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border lg:hidden">
              <span className="text-sm font-semibold text-foreground">Blocks</span>
              <button
                onClick={() => setLeftOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface transition-colors text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <TemplateCanvas
              layout={layout}
              selectedBlockId={selectedBlockId}
              onLayoutChange={update}
              onSelectBlock={(blockId) => {
                setSelectedBlockId(blockId);
                if (blockId) {
                  setLeftOpen(false);
                  setRightOpen(true);
                }
              }}
            />
          </aside>

          {/* Center: Preview iframe */}
          <main className="flex-1 overflow-hidden min-w-0">
            <PreviewFrame layout={layout} className="h-full" logoUrl={tenantProfile?.logo} />
          </main>

          {/* Right: Inspector — desktop static, mobile drawer */}
          <aside
            className={cn(
              'shrink-0 border-l border-border bg-background flex flex-col z-40 transition-transform duration-300',
              // Desktop: always visible, fixed width
              'lg:relative lg:translate-x-0 lg:w-72',
              // Mobile: absolute drawer (right side)
              'fixed top-0 bottom-0 right-0 w-80',
              rightOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
            )}
          >
            {/* Mobile drawer header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border lg:hidden">
              <span className="text-sm font-semibold text-foreground">Inspector</span>
              <button
                onClick={() => setRightOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface transition-colors text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <BlockInspector
              block={selectedBlock}
              layout={layout}
              onBlockChange={handleBlockChange}
              onThemeChange={handleThemeChange}
            />
          </aside>
        </div>
      </div>

      {/* Back navigation guard */}
      <ConfirmDialog
        open={backConfirmOpen}
        title="Unsaved Changes"
        description="You have unsaved changes. Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        variant="warning"
        onConfirm={() => { setBackConfirmOpen(false); router.push('/app/designer'); }}
        onCancel={() => setBackConfirmOpen(false)}
      />
    </>
  );
}
