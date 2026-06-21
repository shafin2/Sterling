'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, CheckCircle, Users, TrendingDown,
  DollarSign, FileText, Pencil, X, Plus, Loader2,
  Download, FileDown, AlertCircle,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  payrollApi, formatPeriod,
  type Payslip, type PayrollAdjustment, type UpdatePayslipDto,
} from '@/lib/api/payroll';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MoneyText } from '@/components/ui/money-text';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// ─── Adjustment editor dialog ─────────────────────────────────────────────────

interface AdjustmentEditorProps {
  slip: Payslip;
  runId: string;
  onClose: () => void;
  onSaved: () => void;
}

function AdjustmentEditor({ slip, runId, onClose, onSaved }: AdjustmentEditorProps) {
  const [bonus, setBonus] = React.useState(String(slip.bonusAmount));
  const [leaveDays, setLeaveDays] = React.useState(String(slip.unpaidLeaveDays));
  const [adjustments, setAdjustments] = React.useState<PayrollAdjustment[]>(slip.adjustments ?? []);
  const [adjName, setAdjName] = React.useState('');
  const [adjAmount, setAdjAmount] = React.useState('');
  const [adjType, setAdjType] = React.useState<'addition' | 'deduction'>('addition');

  const empName = slip.employee ? `${slip.employee.firstName} ${slip.employee.lastName}` : 'Employee';

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { mutate, isPending } = useMutation({
    mutationFn: (dto: UpdatePayslipDto) => payrollApi.updatePayslip(runId, slip.id, dto),
    onSuccess: () => {
      toast.success(`Adjustments saved for ${empName}`);
      onSaved();
      onClose();
    },
    onError: () => toast.error('Failed to save adjustments'),
  });

  function addAdjustment() {
    const amt = parseInt(adjAmount, 10);
    if (!adjName.trim() || isNaN(amt) || amt <= 0) return;
    setAdjustments((prev) => [...prev, { name: adjName.trim(), amount: amt, type: adjType }]);
    setAdjName('');
    setAdjAmount('');
  }

  function handleSave() {
    mutate({
      bonusAmount: Math.max(0, parseInt(bonus, 10) || 0),
      unpaidLeaveDays: Math.max(0, parseInt(leaveDays, 10) || 0),
      adjustments,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl my-4"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Adjust Payslip</h2>
            <p className="text-sm text-muted-foreground">{empName}{slip.employee?.code ? ` · ${slip.employee.code}` : ''}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Bonus + Leave */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Bonus Amount</label>
              <input
                type="number" min="0" value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                placeholder="Minor units (e.g. 500000 = PKR 5,000)"
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
              />
              <p className="text-xs text-muted-foreground">Integer minor units (× 100)</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Unpaid Leave Days</label>
              <input
                type="number" min="0" value={leaveDays}
                onChange={(e) => setLeaveDays(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* One-off adjustments */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">One-off Adjustments</label>
            {adjustments.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {adjustments.map((adj, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-surface/30 px-3 py-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${adj.type === 'addition' ? 'bg-success' : 'bg-danger'}`} />
                    <span className="flex-1 text-sm text-foreground truncate">{adj.name}</span>
                    <MoneyText amount={adj.amount} className="text-sm tabular-nums shrink-0" />
                    <button onClick={() => setAdjustments((prev) => prev.filter((_, idx) => idx !== i))} className="rounded p-0.5 hover:bg-surface transition-colors">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add new adjustment */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as 'addition' | 'deduction')}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none shrink-0"
              >
                <option value="addition">+ Addition</option>
                <option value="deduction">− Deduction</option>
              </select>
              <input
                placeholder="Name"
                value={adjName}
                onChange={(e) => setAdjName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addAdjustment(); }}
                className="flex-1 min-w-0 h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <input
                type="number" min="0" placeholder="Amount"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addAdjustment(); }}
                className="w-28 h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none tabular-nums"
              />
              <Button size="sm" variant="outline" onClick={addAdjustment} className="shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={isPending} className="flex-1">Save Adjustments</Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── PDF Download button per slip ─────────────────────────────────────────────

function SlipPdfButton({ runId, slipId }: { runId: string; slipId: string }) {
  const [loading, setLoading] = React.useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const result = await payrollApi.getPayslipPdf(runId, slipId);
      if (result.status === 'ready' && result.url) {
        window.open(result.url, '_blank', 'noopener');
      } else {
        toast.info('PDF is being generated. Try again in a moment.');
      }
    } catch {
      toast.error('Failed to get payslip PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleDownload} disabled={loading} title="Download PDF">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [editingSlip, setEditingSlip] = React.useState<Payslip | null>(null);
  const [processConfirmOpen, setProcessConfirmOpen] = React.useState(false);
  const [markPaidConfirmOpen, setMarkPaidConfirmOpen] = React.useState(false);

  const { data: run, isLoading, isError } = useQuery({
    queryKey: ['payroll-run', id],
    queryFn: () => payrollApi.get(id),
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 3000 : false),
  });

  const processMutation = useMutation({
    mutationFn: () => payrollApi.process(id),
    onSuccess: () => {
      toast.success('Processing payroll…');
      qc.invalidateQueries({ queryKey: ['payroll-run', id] });
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      setProcessConfirmOpen(false);
    },
    onError: () => { toast.error('Failed to process payroll run'); setProcessConfirmOpen(false); },
  });

  const markPaidMutation = useMutation({
    mutationFn: () => payrollApi.markPaid(id),
    onSuccess: () => {
      toast.success('Payroll marked as paid');
      qc.invalidateQueries({ queryKey: ['payroll-run', id] });
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      setMarkPaidConfirmOpen(false);
    },
    onError: () => { toast.error('Failed to mark payroll as paid'); setMarkPaidConfirmOpen(false); },
  });

  const columns: ColumnDef<Payslip>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee;
        return e ? (
          <div>
            <p className="text-sm font-medium text-foreground whitespace-nowrap">{e.firstName} {e.lastName}</p>
            <p className="text-xs text-muted-foreground">{e.code}{e.jobTitle ? ` · ${e.jobTitle}` : ''}</p>
          </div>
        ) : <span className="text-sm text-muted-foreground">—</span>;
      },
    },
    {
      id: 'basic',
      header: 'Basic',
      cell: ({ row }) => <MoneyText amount={row.original.basicSalary} className="text-sm tabular-nums" />,
    },
    {
      id: 'gross',
      header: 'Gross',
      cell: ({ row }) => <MoneyText amount={row.original.grossSalary} className="text-sm tabular-nums" />,
    },
    {
      id: 'deductions',
      header: 'Deductions',
      cell: ({ row }) => <MoneyText amount={row.original.totalDeductions} className="text-sm text-danger tabular-nums" />,
    },
    {
      id: 'net',
      header: 'Net',
      cell: ({ row }) => <MoneyText amount={row.original.netSalary} className="text-sm font-semibold text-foreground tabular-nums" />,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {run?.status === 'draft' && (
            <Button size="sm" variant="ghost" onClick={() => setEditingSlip(row.original)}>
              <Pencil className="h-3.5 w-3.5" /> Adjust
            </Button>
          )}
          {(run?.status === 'completed' || run?.status === 'paid') && (
            <SlipPdfButton runId={id} slipId={row.original.id} />
          )}
          <Button size="sm" variant="ghost" asChild title="View employee">
            <Link href={`/app/employees/${row.original.employeeId}`}>
              <FileText className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // ── Error / not found state ──
  if (isError || !run) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
          <AlertCircle className="h-7 w-7 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Payroll run not found</h2>
        <p className="text-sm text-muted-foreground max-w-xs">This run may have been deleted or you don't have access.</p>
        <Button variant="outline" onClick={() => router.push('/app/payroll')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll
        </Button>
      </div>
    );
  }

  const period = formatPeriod(run.periodMonth, run.periodYear);
  const isDraft = run.status === 'draft';
  const isProcessing = run.status === 'processing';
  const isCompleted = run.status === 'completed';

  return (
    <>
      <AnimatePresence>
        {editingSlip && (
          <AdjustmentEditor
            slip={editingSlip}
            runId={id}
            onClose={() => setEditingSlip(null)}
            onSaved={() => qc.invalidateQueries({ queryKey: ['payroll-run', id] })}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={processConfirmOpen}
        title="Process Payroll?"
        description={`Start processing ${period}? Payslip numbers will be locked and the BullMQ job will run.`}
        confirmLabel="Process"
        variant="warning"
        loading={processMutation.isPending}
        onConfirm={() => processMutation.mutate()}
        onCancel={() => setProcessConfirmOpen(false)}
      />

      <ConfirmDialog
        open={markPaidConfirmOpen}
        title="Mark as Paid?"
        description={`Mark ${period} as paid? All payslips will be locked and employees will be notified.`}
        confirmLabel="Mark Paid"
        variant="default"
        loading={markPaidMutation.isPending}
        onConfirm={() => markPaidMutation.mutate()}
        onCancel={() => setMarkPaidConfirmOpen(false)}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/app/payroll')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{period}</h1>
                <StatusBadge status={run.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {run.employeeCount} employee{run.employeeCount !== 1 ? 's' : ''}
                {run.notes ? ` · ${run.notes}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* CSV export */}
            <Button variant="outline" size="sm" asChild>
              <a href={`${process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'}/exports/payroll-runs/${id}.csv`} download>
                <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </a>
            </Button>

            {isDraft && (
              <Button onClick={() => setProcessConfirmOpen(true)} loading={processMutation.isPending}>
                <Play className="h-4 w-4" /> Process Payroll
              </Button>
            )}
            {isCompleted && (
              <Button onClick={() => setMarkPaidConfirmOpen(true)} loading={markPaidMutation.isPending}>
                <CheckCircle className="h-4 w-4" /> Mark as Paid
              </Button>
            )}
            {isProcessing && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Processing…
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Gross', value: run.totalGross, icon: DollarSign, cls: '' },
            { label: 'Total Deductions', value: run.totalDeductions, icon: TrendingDown, cls: 'text-danger' },
            { label: 'Net Payable', value: run.totalNet, icon: CheckCircle, cls: 'text-success' },
            { label: 'Employees', value: null, icon: Users, cls: '' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              {value !== null ? (
                <MoneyText amount={value} className={`text-2xl font-bold tabular-nums ${cls}`} />
              ) : (
                <p className="text-2xl font-bold text-foreground">{run.employeeCount}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Payslips table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Payslips</h2>
              <p className="text-sm text-muted-foreground">
                {isDraft
                  ? 'Review and adjust before processing.'
                  : isProcessing
                  ? 'Processing in progress — page refreshes automatically.'
                  : 'Final computed values. Download individual PDFs from the actions column.'}
              </p>
            </div>
            {isDraft && (
              <span className="text-xs text-warning font-medium bg-warning/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                Editable — adjust before processing
              </span>
            )}
          </div>
          <div className="p-4 overflow-x-auto">
            {run.payslips.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No payslips"
                description="No active employees found when this run was created."
                className="border-0 py-10"
              />
            ) : (
              <DataTable
                columns={columns}
                data={run.payslips}
                isLoading={false}
                totalPages={1}
                page={1}
                onPageChange={() => {}}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
