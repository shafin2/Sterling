'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Plus, ChevronRight, Trash2, Play, CheckCircle,
  Users, DollarSign, X, AlertTriangle, Filter,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { payrollApi, formatPeriod, type PayrollRun, type PayrollRunStatus } from '@/lib/api/payroll';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MoneyText } from '@/components/ui/money-text';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// ─── New Run Dialog ───────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function NewRunDialog({ open, onClose, existingRuns }: { open: boolean; onClose: () => void; existingRuns: PayrollRun[] }) {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const [notes, setNotes] = React.useState('');

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // Check if a run already exists for the selected period
  const conflictingRun = existingRuns.find(
    (r) => r.periodMonth === month && r.periodYear === year,
  ) ?? null;

  const { mutate, isPending } = useMutation({
    mutationFn: () => payrollApi.create({ periodMonth: month, periodYear: year, notes: notes || undefined }),
    onSuccess: (run) => {
      toast.success(`Payroll run created for ${formatPeriod(run.periodMonth, run.periodYear)}`);
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      onClose();
      setNotes('');
    },
    onError: async (err: any) => {
      // Parse NestJS error body from ky HTTPError
      let message = 'Failed to create payroll run';
      try {
        const body = await err?.response?.json?.();
        if (body?.message) message = Array.isArray(body.message) ? body.message[0] : body.message;
      } catch { /* ignore */ }
      toast.error(message);
    },
  });

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">New Payroll Run</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Creates draft payslips for all active employees.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Conflict warning — shown when a run already exists for the selected period */}
          {conflictingRun ? (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 flex gap-3">
              <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-danger">Run already exists</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A payroll run for <strong>{formatPeriod(month, year)}</strong> already exists
                  {conflictingRun.status === 'draft' ? ' (draft — you can delete it and recreate)' : ` and is ${conflictingRun.status}`}.
                </p>
                <Link
                  href={`/app/payroll/${conflictingRun.id}`}
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-accent transition-colors"
                >
                  View existing run →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Includes Q4 bonus"
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 flex gap-3">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Payslips will be generated for all <strong>active employees</strong> with a current salary structure. You can edit adjustments before processing.
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => mutate()} loading={isPending} disabled={!!conflictingRun} className="flex-1">
            <Plus className="h-4 w-4" /> Create Run
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: PayrollRunStatus | '' }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paid', value: 'paid' },
];

export default function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<PayrollRunStatus | ''>('');
  const [yearFilter, setYearFilter] = React.useState<string>('');
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [processId, setProcessId] = React.useState<string | null>(null);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-runs', page, statusFilter, yearFilter],
    queryFn: () => payrollApi.list({
      page,
      limit: 20,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(yearFilter ? { year: Number(yearFilter) } : {}),
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollApi.delete(id),
    onSuccess: () => {
      toast.success('Payroll run deleted');
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      setDeleteId(null);
    },
    onError: () => { toast.error('Failed to delete payroll run'); setDeleteId(null); },
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => payrollApi.process(id),
    onSuccess: (run) => {
      toast.success(`Processing ${formatPeriod(run.periodMonth, run.periodYear)}…`);
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      setProcessId(null);
    },
    onError: () => { toast.error('Failed to start processing'); setProcessId(null); },
  });

  const columns: ColumnDef<PayrollRun>[] = [
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => (
        <Link href={`/app/payroll/${row.original.id}`} className="font-medium text-foreground hover:text-accent transition-colors flex items-center gap-1.5 whitespace-nowrap">
          {formatPeriod(row.original.periodMonth, row.original.periodYear)}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'employeeCount',
      header: 'Employees',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
          <Users className="h-3.5 w-3.5" />{row.original.employeeCount}
        </span>
      ),
    },
    {
      id: 'totalGross',
      header: 'Gross',
      cell: ({ row }) => <MoneyText amount={row.original.totalGross} className="text-sm tabular-nums" />,
    },
    {
      id: 'totalNet',
      header: 'Net Payable',
      cell: ({ row }) => <MoneyText amount={row.original.totalNet} className="text-sm font-semibold text-foreground tabular-nums" />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const r = row.original;
        const isProcessingThis = processMutation.isPending && processId === r.id;
        const isDeletingThis = deleteMutation.isPending && deleteId === r.id;
        return (
          <div className="flex items-center justify-end gap-1">
            {r.status === 'draft' && (
              <Button
                size="sm"
                variant="ghost"
                loading={isProcessingThis}
                onClick={() => setProcessId(r.id)}
              >
                <Play className="h-3.5 w-3.5" /> Process
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/app/payroll/${r.id}`}>
                <ChevronRight className="h-3.5 w-3.5" /> View
              </Link>
            </Button>
            {r.status === 'draft' && (
              <Button
                size="sm"
                variant="ghost"
                loading={isDeletingThis}
                onClick={() => setDeleteId(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const currentMonthRun = data?.data.find(
    (r) => r.periodMonth === now.getMonth() + 1 && r.periodYear === now.getFullYear(),
  );
  const lastCompleted = data?.data.find((r) => r.status === 'completed' || r.status === 'paid');
  const deleteTarget = data?.data.find((r) => r.id === deleteId);
  const processTarget = data?.data.find((r) => r.id === processId);

  return (
    <>
      <AnimatePresence>
        {dialogOpen && (
          <NewRunDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            existingRuns={data?.data ?? []}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Payroll Run?"
        description={deleteTarget ? `Delete the draft run for ${formatPeriod(deleteTarget.periodMonth, deleteTarget.periodYear)}? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={!!processId}
        title="Process Payroll Run?"
        description={processTarget ? `Start processing ${formatPeriod(processTarget.periodMonth, processTarget.periodYear)}? Numbers will be locked once processing begins.` : ''}
        confirmLabel="Process"
        variant="warning"
        loading={processMutation.isPending}
        onConfirm={() => processId && processMutation.mutate(processId)}
        onCancel={() => setProcessId(null)}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Payroll</h1>
            <p className="mt-1 text-muted-foreground">Process monthly salaries and generate branded payslips.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New Payroll Run
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))
          ) : (
            <>
              {[
                {
                  label: 'This month net',
                  value: currentMonthRun
                    ? <MoneyText amount={currentMonthRun.totalNet} className="text-2xl font-bold tabular-nums" />
                    : <span className="text-2xl font-bold text-muted-foreground">—</span>,
                  icon: DollarSign,
                  sub: currentMonthRun ? formatPeriod(currentMonthRun.periodMonth, currentMonthRun.periodYear) : 'No run this month',
                },
                {
                  label: 'Total runs',
                  value: <span className="text-2xl font-bold text-foreground">{data?.meta.total ?? 0}</span>,
                  icon: Briefcase,
                  sub: 'All time',
                },
                {
                  label: 'This month employees',
                  value: <span className="text-2xl font-bold text-foreground">{currentMonthRun?.employeeCount ?? '—'}</span>,
                  icon: Users,
                  sub: currentMonthRun ? 'Active' : 'No run this month',
                },
                {
                  label: 'Last completed',
                  value: (
                    <span className="text-2xl font-bold text-foreground">
                      {lastCompleted ? formatPeriod(lastCompleted.periodMonth, lastCompleted.periodYear) : '—'}
                    </span>
                  ),
                  icon: CheckCircle,
                  sub: 'Most recent',
                },
              ].map(({ label, value, icon: Icon, sub }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  {value}
                  <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                </motion.div>
              ))}
            </>
          )}
        </div>

        {/* Filters + table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Payroll Runs</h2>
              <p className="text-sm text-muted-foreground">Newest first. Click a period to view payslips.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as PayrollRunStatus | ''); setPage(1); }}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={yearFilter}
                onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="">All Years</option>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.data.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No payroll runs yet"
                description={statusFilter || yearFilter ? 'No runs match the current filters.' : 'Click "New Payroll Run" to process your first month.'}
                action={!statusFilter && !yearFilter ? <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Payroll Run</Button> : undefined}
                className="border-0 py-12"
              />
            ) : (
              <DataTable
                columns={columns}
                data={data?.data ?? []}
                isLoading={false}
                totalPages={data?.meta.totalPages ?? 1}
                page={page}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
