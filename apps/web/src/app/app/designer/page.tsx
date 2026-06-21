'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Copy, Star, Trash2, LayoutTemplate,
  CheckCircle, Palette, X,
} from 'lucide-react';
import { templatesApi, type Template } from '@/lib/api/templates';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// ─── New Template Dialog ──────────────────────────────────────────────────────

const DEFAULT_LAYOUT = {
  version: 1 as const,
  theme: {
    primaryColor: '#3D52A0',
    accentColor: '#7091E6',
    textColor: '#1a1a2e',
    mutedColor: '#8697C4',
    borderColor: '#ADBBDA',
    fontFamily: 'system',
    paperSize: 'A4' as const,
  },
  blocks: [
    { id: 'header', type: 'header' as const, visible: true, settings: { title: 'INVOICE', showCompanyName: true, showInvoiceNumber: true, showStatus: true, layout: 'split' } },
    { id: 'spacer1', type: 'spacer' as const, visible: true, settings: { height: 8 } },
    { id: 'client-info', type: 'client-info' as const, visible: true, settings: { label: 'Bill To', showEmail: true, showPhone: false, showAddress: true } },
    { id: 'invoice-meta', type: 'invoice-meta' as const, visible: true, settings: { label: 'Invoice Details', showIssueDate: true, showDueDate: true, showCurrency: false } },
    { id: 'divider1', type: 'divider' as const, visible: true, settings: { thickness: 1, color: '', style: 'solid' } },
    { id: 'items-table', type: 'items-table' as const, visible: true, settings: { showQty: true, showUnitPrice: true, alternateRows: true, headerBgColor: '#3D52A0' } },
    { id: 'spacer2', type: 'spacer' as const, visible: true, settings: { height: 8 } },
    { id: 'totals', type: 'totals' as const, visible: true, settings: { showSubtotal: true, showTax: true, showDiscount: true, showAmountPaid: true } },
    { id: 'spacer3', type: 'spacer' as const, visible: true, settings: { height: 16 } },
    { id: 'notes', type: 'notes' as const, visible: true, settings: { label: 'Notes', customText: '' } },
    { id: 'terms', type: 'terms' as const, visible: true, settings: { label: 'Terms & Conditions', customText: '' } },
    { id: 'spacer4', type: 'spacer' as const, visible: true, settings: { height: 24 } },
    { id: 'footer', type: 'footer' as const, visible: true, settings: { text: 'Thank you for your business!', showBranding: true } },
  ],
};

function NewTemplateDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const create = useMutation({
    mutationFn: () =>
      templatesApi.create({ name: name.trim(), description: description.trim() || undefined, layout: DEFAULT_LAYOUT }),
    onSuccess: (template) => {
      toast.success('Template created');
      qc.invalidateQueries({ queryKey: ['templates'] });
      onClose();
      router.push(`/app/designer/${template.id}`);
    },
    onError: () => toast.error('Failed to create template'),
  });

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <LayoutTemplate className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">New Template</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Custom Template"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted/60"
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) create.mutate(); }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional short description…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted/60"
            />
          </div>
          <p className="text-xs text-muted">The template starts with the Classic Sterling layout. Customise it in the designer.</p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!name.trim()}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus className="h-4 w-4" /> Create & Edit
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onClone, onSetDefault, onDeleteRequest }: {
  template: Template;
  onClone: () => void;
  onSetDefault: () => void;
  onDeleteRequest: () => void;
}) {
  const primary = template.layout?.theme?.primaryColor ?? '#3D52A0';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative rounded-2xl border border-border bg-background overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ height: 160, background: '#F9FAFB' }}>
        <div className="absolute inset-3 bg-white rounded-lg shadow-sm overflow-hidden">
          <div style={{ background: primary, height: 32 }} className="flex items-center px-3 justify-between">
            <div className="h-2 w-16 rounded-full bg-white/30" />
            <div className="h-2 w-10 rounded-full bg-white/50" />
          </div>
          <div className="p-2 space-y-1.5">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-8 rounded bg-gray-200" />
                <div className="h-1.5 w-16 rounded bg-gray-300" />
                <div className="h-1.5 w-12 rounded bg-gray-200" />
              </div>
              <div className="text-right space-y-1">
                <div className="h-1.5 w-10 rounded bg-gray-200" />
                <div className="h-1.5 w-8 rounded bg-gray-200" />
              </div>
            </div>
            <div className="h-0.5 bg-gray-100 rounded" />
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-1 items-center">
                  <div className="flex-1 h-1.5 rounded bg-gray-100" />
                  <div className="h-1.5 w-6 rounded bg-gray-100" />
                  <div className="h-1.5 w-8 rounded bg-gray-100" />
                </div>
              ))}
            </div>
            <div className="h-0.5 bg-gray-100 rounded" />
            <div className="flex justify-end">
              <div className="h-1.5 w-12 rounded" style={{ background: primary, opacity: 0.7 }} />
            </div>
          </div>
        </div>
        {template.isDefault && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
            <CheckCircle className="h-2.5 w-2.5" /> Default
          </div>
        )}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{template.name}</h3>
            {template.description && (
              <p className="text-xs text-muted mt-0.5 line-clamp-2">{template.description}</p>
            )}
          </div>
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: primary + '20', color: primary }}
          >
            <Palette className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
            <Link href={`/app/designer/${template.id}`}><Pencil className="mr-1.5 h-3 w-3" /> Edit</Link>
          </Button>
          <button
            onClick={onClone}
            title="Clone template"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface hover:text-foreground transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {!template.isDefault && (
            <button
              onClick={onSetDefault}
              title="Set as default"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface hover:text-warning transition-colors"
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          )}
          {!template.isDefault && (
            <button
              onClick={onDeleteRequest}
              title="Delete template"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:bg-danger/10 hover:text-danger transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignerGalleryPage() {
  const qc = useQueryClient();
  const [showNewDialog, setShowNewDialog] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  });

  const clone = useMutation({
    mutationFn: (id: string) => templatesApi.clone(id),
    onSuccess: () => { toast.success('Template cloned'); qc.invalidateQueries({ queryKey: ['templates'] }); },
    onError: () => toast.error('Failed to clone template'),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => templatesApi.setDefault(id),
    onSuccess: () => { toast.success('Default template updated'); qc.invalidateQueries({ queryKey: ['templates'] }); },
    onError: () => toast.error('Failed to update default'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      toast.success('Template deleted');
      qc.invalidateQueries({ queryKey: ['templates'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Cannot delete the default template'),
  });

  const deleteTarget = templates.find((t) => t.id === deleteId);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoice Designer</h1>
            <p className="text-sm text-muted mt-1">
              Design branded invoice templates. The default template is applied to all new invoices.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : templates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <LayoutTemplate className="h-7 w-7" />
            </div>
            <h3 className="font-semibold text-foreground">No templates yet</h3>
            <p className="text-sm text-muted mt-1 max-w-sm">Create your first template or they will be auto-seeded on your next visit.</p>
            <Button className="mt-4" size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClone={() => clone.mutate(t.id)}
                  onSetDefault={() => setDefault.mutate(t.id)}
                  onDeleteRequest={() => setDeleteId(t.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Legend */}
        {templates.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-surface/50 p-4 text-xs text-muted flex flex-wrap gap-4"
          >
            <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Default template applied to all new invoices</div>
            <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-warning" /> Set any template as the new default</div>
            <div className="flex items-center gap-1.5"><Copy className="h-3.5 w-3.5 text-accent" /> Clone a template to create a variant</div>
          </motion.div>
        )}
      </div>

      {/* New template dialog */}
      <AnimatePresence>
        {showNewDialog && <NewTemplateDialog onClose={() => setShowNewDialog(false)} />}
      </AnimatePresence>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Template?"
        description={`"${deleteTarget?.name ?? ''}" will be permanently deleted.`}
        confirmLabel="Delete"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
