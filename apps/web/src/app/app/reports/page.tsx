'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Download, TrendingUp, FileText, Briefcase,
  Printer, RefreshCw, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react';
import { analyticsApi, exportApi } from '@/lib/api/analytics';
import { MoneyText } from '@/components/ui/money-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY  = '#3D52A0';
const ACCENT   = '#7091E6';
const SUCCESS  = '#2E9E7B';
const WARNING  = '#D99A4E';
const DANGER   = '#C9485B';
const MUTED    = '#8697C4';

const STATUS_COLORS: Record<string, string> = {
  draft: MUTED, sent: WARNING, paid: SUCCESS, overdue: DANGER,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ChartCard({ title, action, children, loading, className = '' }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; loading?: boolean; className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="p-5">
        {loading ? <Skeleton className="h-48 w-full rounded-lg" /> : children}
      </div>
    </div>
  );
}

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; name: string; color: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {(p.value / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => Promise<void> }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      size="sm" variant="outline"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try { await onClick(); toast.success('Download started'); }
        catch { toast.error('Export failed'); }
        finally { setLoading(false); }
      }}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

// ─── Year picker ──────────────────────────────────────────────────────────────

function YearPicker({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(year - 1)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
        aria-label="Previous year"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground min-w-[4.5rem] justify-center">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        {year}
      </span>
      <button
        onClick={() => onChange(year + 1)}
        disabled={year >= new Date().getFullYear()}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Next year"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'financial', label: 'Financial Summary', icon: TrendingUp },
  { id: 'invoices',  label: 'Invoice Analytics', icon: FileText },
  { id: 'payroll',   label: 'Payroll Analytics', icon: Briefcase },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState('financial');
  const [year, setYear] = React.useState(() => new Date().getFullYear());

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.dashboard(),
    staleTime: 60_000,
  });

  const { data: revenueChart, isLoading: revLoading } = useQuery({
    queryKey: ['analytics', 'revenue', year],
    queryFn: () => analyticsApi.revenue(year),
    staleTime: 60_000,
  });

  const { data: payrollChart, isLoading: payLoading } = useQuery({
    queryKey: ['analytics', 'payroll', year],
    queryFn: () => analyticsApi.payroll(year),
    staleTime: 60_000,
  });

  const { data: aging, isLoading: agingLoading } = useQuery({
    queryKey: ['analytics', 'aging'],
    queryFn: () => analyticsApi.aging(),
    staleTime: 60_000,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const handlePrint = () => {
    window.print();
  };

  const statusColors = stats?.invoiceStatus.map((s) => STATUS_COLORS[s.status] ?? MUTED) ?? [];

  return (
    <>
      {/* Print-only title */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Sterling — Reports ({year})</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generated {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
        </p>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
            <p className="mt-1 text-muted-foreground">Financial summaries, analytics, and data exports.</p>
          </div>
          <div className="flex items-center gap-2">
            <YearPicker year={year} onChange={setYear} />
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Report sections"
          className="flex gap-1 rounded-xl border border-border bg-surface/30 p-1 w-fit print:hidden"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                tab === id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ─── Financial Summary tab ─────────────────────────────── */}
        {tab === 'financial' && (
          <motion.div
            key="financial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: 'Total revenue (this month)', value: stats?.revenue.total ?? 0, color: '' },
                { label: 'Outstanding',                value: stats?.outstanding.total ?? 0, color: 'text-warning' },
                { label: 'Overdue',                   value: stats?.overdue.total ?? 0,     color: 'text-danger' },
                { label: 'Payroll (this month)',       value: stats?.payroll.thisMonth ?? 0, color: '' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs text-muted-foreground mb-2">{label}</p>
                  {statsLoading
                    ? <Skeleton className="h-7 w-32" />
                    : <MoneyText amount={value} className={cn('text-xl font-bold', color)} />
                  }
                </div>
              ))}
            </div>

            <ChartCard
              title={`Revenue — ${year}`}
              action={
                <div className="flex items-center gap-2 print:hidden">
                  <ExportBtn label="Export Invoices" onClick={exportApi.invoices} />
                </div>
              }
              loading={revLoading}
            >
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revenueChart ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PRIMARY} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<MoneyTooltip />} />
                  <Area
                    type="monotone" dataKey="revenue" name="Revenue"
                    stroke={PRIMARY} fill="url(#rGrad)" strokeWidth={2} dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        )}

        {/* ─── Invoice Analytics tab ─────────────────────────────── */}
        {tab === 'invoices' && (
          <motion.div
            key="invoices"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Status breakdown */}
              <ChartCard
                title="Invoice Status Breakdown"
                action={
                  <div className="flex items-center gap-2 print:hidden">
                    <ExportBtn label="Export CSV" onClick={exportApi.invoices} />
                  </div>
                }
                loading={statsLoading}
              >
                {stats?.invoiceStatus.length ? (
                  <div className="grid grid-cols-2 gap-6 items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={stats.invoiceStatus}
                          dataKey="count" nameKey="status"
                          cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}
                        >
                          {stats.invoiceStatus.map((entry, i) => (
                            <Cell key={entry.status} fill={statusColors[i] ?? MUTED} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          formatter={(v, name) => [v, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {stats.invoiceStatus.map((s, i) => (
                        <div key={s.status} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColors[i] }} />
                            <span className="text-foreground capitalize">{s.status}</span>
                          </span>
                          <div className="text-right">
                            <div className="font-medium text-foreground">{s.count}</div>
                            <MoneyText amount={s.total} className="text-xs text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No data</div>
                )}
              </ChartCard>

              {/* AR Aging */}
              <ChartCard title="AR Aging Report" loading={agingLoading}>
                {aging?.length ? (
                  <div className="space-y-3">
                    {aging.map((bucket) => {
                      const maxAmt = Math.max(...aging.map((b) => b.amount), 1);
                      const pct    = Math.round((bucket.amount / maxAmt) * 100);
                      const color  =
                        bucket.key === 'current' ? SUCCESS
                          : bucket.key === '1-30' ? WARNING
                          : DANGER;
                      return (
                        <div key={bucket.key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground">{bucket.label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</span>
                              <MoneyText amount={bucket.amount} className="text-sm font-medium" />
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-surface overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No outstanding invoices</div>
                )}
              </ChartCard>
            </div>
          </motion.div>
        )}

        {/* ─── Payroll Analytics tab ─────────────────────────────── */}
        {tab === 'payroll' && (
          <motion.div
            key="payroll"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* YTD summary */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {[
                {
                  label: `YTD Net Payroll (${year})`,
                  value: payrollChart?.reduce((s, m) => s + m.net, 0) ?? 0,
                  count: undefined as number | undefined,
                },
                {
                  label: `YTD Gross Payroll (${year})`,
                  value: payrollChart?.reduce((s, m) => s + m.gross, 0) ?? 0,
                  count: undefined,
                },
                {
                  label: 'Processed months',
                  value: undefined as number | undefined,
                  count: payrollChart?.filter((m) => m.net > 0).length ?? 0,
                },
              ].map(({ label, value, count }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs text-muted-foreground mb-2">{label}</p>
                  {payLoading
                    ? <Skeleton className="h-7 w-32" />
                    : value !== undefined
                      ? <MoneyText amount={value} className="text-xl font-bold" />
                      : <span className="text-xl font-bold text-foreground">{count}</span>
                  }
                </div>
              ))}
            </div>

            <ChartCard
              title={`Payroll Expense — ${year}`}
              action={
                <div className="flex items-center gap-2 print:hidden">
                  <ExportBtn label="Export Employees" onClick={exportApi.employees} />
                </div>
              }
              loading={payLoading}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={payrollChart ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<MoneyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="gross" name="Gross" fill={`${PRIMARY}60`} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="net"   name="Net"   fill={ACCENT}         radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        )}
      </div>
    </>
  );
}
