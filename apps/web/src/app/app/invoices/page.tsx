'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus, Search, FileText, Copy, Send,
  Pencil, Trash2, ExternalLink, Sparkles, X, Check, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { invoicesApi, type Invoice } from '@/lib/api/invoices';
import { clientsApi } from '@/lib/api/clients';
import { api } from '@/lib/api';
import { DataTable, checkboxColumn } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MoneyText } from '@/components/ui/money-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatMoney } from '@sterling/shared';

// ─── AI dialog ────────────────────────────────────────────────────────────────

interface AiDraft {
  clientHint: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

function AiInvoiceDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [prompt, setPrompt] = React.useState('');
  const [draft, setDraft] = React.useState<AiDraft | null>(null);
  const [clientId, setClientId] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ page: 1, limit: 100 }).then((r) => r.data),
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setDraft(null);
    try {
      const result = await api
        .post('invoices/generate-from-prompt', { json: { prompt } })
        .json<AiDraft>();
      setDraft(result);
    } catch {
      toast.error('AI generation failed. Check your prompt or try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!draft || !clientId) { toast.error('Select a client first'); return; }
    setCreating(true);
    try {
      const invoice = await invoicesApi.create({
        clientId,
        issueDate: draft.issueDate,
        dueDate: draft.dueDate,
        notes: draft.notes,
        currency: 'PKR',
        taxRate: 0,
        discountAmount: 0,
        items: draft.items.map((item, i) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: i,
        })),
      });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Draft invoice created from AI');
      onClose();
      router.push(`/app/invoices/${invoice.id}`);
    } catch {
      toast.error('Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const total = draft?.items.reduce((s, i) => s + Math.round(i.quantity * i.unitPrice), 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8 sm:my-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Generate Invoice with AI</h2>
              <p className="text-xs text-muted-foreground">Describe what you need in plain language</p>
            </div>
          </div>
          <button onClick={onClose} className="ml-2 shrink-0 rounded-lg p-1.5 hover:bg-surface transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
            }}
            placeholder='e.g. "Invoice for web development: 40 hours at PKR 5,000/hr, plus hosting setup PKR 15,000. Due in 30 days."'
            rows={3}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!prompt.trim()}
            className="w-full"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? 'Generating…' : 'Generate (Ctrl+Enter)'}
          </Button>
        </div>

        {/* Draft preview */}
        {draft && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2">
              <p className="text-xs text-success font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Draft generated — review and create
              </p>
              {draft.clientHint && (
                <p className="text-xs text-muted-foreground mt-0.5">Client hint: &ldquo;{draft.clientHint}&rdquo;</p>
              )}
            </div>

            {/* Items preview */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[320px]">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Description</th>
                      <th className="px-3 py-2 text-right text-muted-foreground font-medium whitespace-nowrap">Qty</th>
                      <th className="px-3 py-2 text-right text-muted-foreground font-medium whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.items.map((item, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2 text-foreground">{item.description}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {(Math.round(item.quantity * item.unitPrice) / 100).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-surface/30">
                      <td colSpan={2} className="px-3 py-2 text-right text-xs font-semibold text-foreground">Total</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-primary">
                        {(total / 100).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Client selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Select client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="">Choose a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!clientId}
              className="w-full"
            >
              <Check className="h-4 w-4" /> Create Draft Invoice
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [showAi, setShowAi] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [sendId, setSendId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, debouncedSearch, statusFilter, dateFrom, dateTo],
    queryFn: () =>
      invoicesApi.list({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        status: (statusFilter || undefined) as any,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.send(id),
    onSuccess: () => {
      toast.success('Invoice sent');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setSendId(null);
    },
    onError: () => toast.error('Failed to send invoice'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.duplicate(id),
    onSuccess: () => { toast.success('Invoice duplicated'); qc.invalidateQueries({ queryKey: ['invoices'] }); },
    onError: () => toast.error('Failed to duplicate'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Only draft invoices can be deleted'),
  });

  const columns: ColumnDef<Invoice>[] = [
    checkboxColumn<Invoice>(),
    {
      id: 'number',
      header: 'Invoice',
      cell: ({ row }) => (
        <div>
          <Link
            href={`/app/invoices/${row.original.id}`}
            className="font-mono font-semibold text-primary hover:underline"
          >
            {row.original.number}
          </Link>
          <p className="text-xs text-muted">{row.original.client?.name ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'issueDate',
      header: 'Date',
      accessorKey: 'issueDate',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted whitespace-nowrap">
          {new Date(getValue() as string).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due',
      accessorKey: 'dueDate',
      cell: ({ row }) => {
        const due = new Date(row.original.dueDate);
        const isOverdue = due < new Date() && row.original.status === 'sent';
        return (
          <span className={`text-sm whitespace-nowrap ${isOverdue ? 'text-danger font-medium' : 'text-muted'}`}>
            {due.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => (
        <MoneyText
          amount={row.original.total}
          currency={row.original.currency}
          className="font-semibold tabular-nums whitespace-nowrap"
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {inv.status === 'draft' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSendId(inv.id)}
                title="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(inv.id)} title="Duplicate">
              <Copy className="h-4 w-4" />
            </Button>
            {inv.status === 'draft' && (
              <Button variant="ghost" size="sm" asChild title="Edit">
                <Link href={`/app/invoices/${inv.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild title="View">
              <Link href={`/app/invoices/${inv.id}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
            {inv.status === 'draft' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(inv.id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const totalAmount = data?.totals.totalAmount ?? 0;
  const deleteTarget = data?.data.find((inv) => inv.id === deleteId);
  const sendTarget = data?.data.find((inv) => inv.id === sendId);

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
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
            <p className="text-sm text-muted">
              {data?.meta.total ?? 0} invoice{data?.meta.total !== 1 ? 's' : ''} ·{' '}
              <MoneyText amount={totalAmount} currency="PKR" className="font-semibold text-foreground" />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAi(true)}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
            </Button>
            <Button size="sm" asChild>
              <Link href="/app/invoices/new">
                <Plus className="mr-2 h-4 w-4" /> New Invoice
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row flex-wrap">
          <div className="relative flex-1 min-w-0 sm:min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search invoices or clients..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          totalPages={data?.meta.totalPages ?? 1}
          page={page}
          onPageChange={setPage}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice to get started."
              action={
                <Button asChild>
                  <Link href="/app/invoices/new">
                    <Plus className="mr-2 h-4 w-4" /> New Invoice
                  </Link>
                </Button>
              }
            />
          }
        />
      </div>

      {/* AI dialog */}
      <AnimatePresence>
        {showAi && <AiInvoiceDialog onClose={() => setShowAi(false)} />}
      </AnimatePresence>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Invoice?"
        description={`Invoice ${deleteTarget?.number ?? ''} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Send confirm */}
      <ConfirmDialog
        open={!!sendId}
        title="Send Invoice?"
        description={`Invoice ${sendTarget?.number ?? ''} will be sent to ${sendTarget?.client?.name ?? 'the client'} and marked as Sent.`}
        confirmLabel="Send"
        variant="default"
        loading={sendMutation.isPending}
        onConfirm={() => sendId && sendMutation.mutate(sendId)}
        onCancel={() => setSendId(null)}
      />
    </>
  );
}
