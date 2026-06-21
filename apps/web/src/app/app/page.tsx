'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from 'recharts';
import {
  DollarSign, Clock, AlertTriangle, Briefcase,
  Users, UserCheck, TrendingUp, TrendingDown, ArrowRight, RefreshCw,
  ChevronLeft, ChevronRight, CalendarDays, Sparkles, CheckCircle, Lightbulb,
} from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics';
import { MoneyText } from '@/components/ui/money-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Design tokens for charts ─────────────────────────────────────────────────
const PRIMARY  = '#3D52A0';
const ACCENT   = '#7091E6';
const SUCCESS  = '#2E9E7B';
const WARNING  = '#D99A4E';
const DANGER   = '#C9485B';
const MUTED    = '#8697C4';

const STATUS_COLORS: Record<string, string> = {
  draft:   MUTED,
  sent:    WARNING,
  paid:    SUCCESS,
  overdue: DANGER,
};

// ─── Count-up animation hook ──────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [current, setCurrent] = React.useState(0);
  React.useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    let startTime: number | null = null;
    let rafId = 0;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setCurrent(Math.round(ease * target));
      if (progress < 1) { rafId = requestAnimationFrame(step); }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return current;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  countTo: number;
  isMoney?: boolean;
  sub?: React.ReactNode;
  icon: React.ElementType;
  trend?: number | null;
  href?: string;
  loading?: boolean;
}

function KpiCard({ label, countTo, isMoney = false, sub, icon: Icon, trend, href, loading }: KpiCardProps) {
  const animated = useCountUp(countTo);

  const displayValue = isMoney
    ? <MoneyText amount={animated} />
    : <span>{animated.toLocaleString()}</span>;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 hover:border-accent/40 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-36 mb-1" />
          <Skeleton className="h-4 w-24" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold tabular-nums text-foreground">{displayValue}</div>
          {(sub || trend != null) && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {trend != null && (
                <span className={cn('flex items-center gap-0.5 font-medium', trend >= 0 ? 'text-success' : 'text-danger')}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend)}%
                </span>
              )}
              {sub}
            </div>
          )}
        </>
      )}
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
          View details <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Chart wrapper ────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, loading, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; loading?: boolean; className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">
        {loading ? <Skeleton className="h-48 w-full" /> : children}
      </div>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const queryClient = useQueryClient();
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

  const { data: cashflowChart, isLoading: cashLoading } = useQuery({
    queryKey: ['analytics', 'cashflow', year],
    queryFn: () => analyticsApi.cashflow(year),
    staleTime: 60_000,
  });

  const { data: topClients, isLoading: clientsLoading } = useQuery({
    queryKey: ['analytics', 'top-clients'],
    queryFn: () => analyticsApi.topClients(),
    staleTime: 60_000,
  });

  const { data: upcomingDues, isLoading: duesLoading } = useQuery({
    queryKey: ['analytics', 'upcoming-dues'],
    queryFn: () => analyticsApi.upcomingDues(),
    staleTime: 60_000,
  });

  const { data: aiInsights, isLoading: aiLoading } = useQuery({
    queryKey: ['analytics', 'ai-insights', year],
    queryFn: () => analyticsApi.aiInsights(year),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const payrollTrend = stats
    ? stats.payroll.lastMonth > 0
      ? Math.round(((stats.payroll.thisMonth - stats.payroll.lastMonth) / stats.payroll.lastMonth) * 100)
      : null
    : null;

  // Donut data colour map
  const statusColors = stats?.invoiceStatus.map((s) => STATUS_COLORS[s.status] ?? MUTED) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Financial overview</p>
        </div>
        <div className="flex items-center gap-2">
          <YearPicker year={year} onChange={setYear} />
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Revenue this month"
          countTo={stats?.revenue.total ?? 0}
          isMoney
          icon={DollarSign}
          trend={stats?.revenue.trend ?? null}
          sub="vs last month"
          href="/app/invoices?status=paid"
          loading={statsLoading}
        />
        <KpiCard
          label="Outstanding"
          countTo={stats?.outstanding.total ?? 0}
          isMoney
          sub={`${stats?.outstanding.count ?? 0} invoice${(stats?.outstanding.count ?? 0) !== 1 ? 's' : ''}`}
          icon={Clock}
          href="/app/invoices?status=sent"
          loading={statsLoading}
        />
        <KpiCard
          label="Overdue"
          countTo={stats?.overdue.total ?? 0}
          isMoney
          sub={`${stats?.overdue.count ?? 0} invoice${(stats?.overdue.count ?? 0) !== 1 ? 's' : ''}`}
          icon={AlertTriangle}
          href="/app/invoices?status=overdue"
          loading={statsLoading}
        />
        <KpiCard
          label="Payroll this month"
          countTo={stats?.payroll.thisMonth ?? 0}
          isMoney
          icon={Briefcase}
          trend={payrollTrend}
          sub="net payable"
          href="/app/payroll"
          loading={statsLoading}
        />
        <KpiCard
          label="Active clients"
          countTo={stats?.clients.active ?? 0}
          isMoney={false}
          icon={Users}
          href="/app/clients"
          loading={statsLoading}
        />
        <KpiCard
          label="Active employees"
          countTo={stats?.employees.active ?? 0}
          isMoney={false}
          icon={UserCheck}
          href="/app/employees"
          loading={statsLoading}
        />
      </div>

      {/* AI Payroll Insights */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-accent/20 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent p-5"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-300 shadow-md">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">AI Payroll Insights</h3>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wide">Powered by Groq</span>
              {aiInsights?.generatedAt && !aiLoading && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(aiInsights.generatedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {aiLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : aiInsights ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground/80 leading-relaxed">{aiInsights.summary}</p>
                {aiInsights.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {aiInsights.highlights.map((h, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-lg bg-background/70 border border-border/50 px-3 py-1.5 text-xs text-foreground">
                        <CheckCircle className="h-3 w-3 text-success shrink-0" />
                        {h}
                      </span>
                    ))}
                  </div>
                )}
                {aiInsights.recommendation && (
                  <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2">
                    <Lightbulb className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground/80">{aiInsights.recommendation}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payroll data available for AI insights yet.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Charts row 1 — Revenue + Status donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Revenue"
          subtitle={`Monthly paid invoices — ${year}`}
          loading={revLoading}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChart ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<MoneyTooltip />} />
              <Area
                type="monotone" dataKey="revenue" name="Revenue"
                stroke={PRIMARY} fill="url(#revGrad)" strokeWidth={2} dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Invoice Status"
          subtitle="All-time breakdown"
          loading={statsLoading}
        >
          {stats?.invoiceStatus.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.invoiceStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                >
                  {stats.invoiceStatus.map((entry, i) => (
                    <Cell key={entry.status} fill={statusColors[i] ?? MUTED} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No invoice data yet</div>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 — Payroll + Cashflow */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Payroll Expense"
          subtitle={`Monthly net payroll — ${year}`}
          loading={payLoading}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payrollChart ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<MoneyTooltip />} />
              <Bar dataKey="net"   name="Net"   fill={ACCENT}       radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="gross" name="Gross" fill={`${PRIMARY}40`} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Net Cashflow"
          subtitle={`Revenue minus payroll expense — ${year}`}
          loading={cashLoading}
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cashflowChart ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cfGradPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={SUCCESS} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={SUCCESS} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cfGradNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={DANGER} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={DANGER} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<MoneyTooltip />} />
              <ReferenceLine y={0} stroke={MUTED} strokeDasharray="3 3" strokeOpacity={0.5} />
              <Bar dataKey="revenue" name="Revenue" fill={`${SUCCESS}30`} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="payroll" name="Payroll" fill={`${DANGER}30`}  radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Line
                type="monotone" dataKey="cashflow" name="Net Cashflow"
                stroke={PRIMARY} strokeWidth={2} dot={{ r: 3, fill: PRIMARY }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 3 — Top clients + Upcoming dues */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Top Clients" subtitle="By paid revenue" loading={clientsLoading}>
          {topClients?.length ? (
            <div className="space-y-3">
              {topClients.map((client, i) => {
                const max = topClients[0]?.totalPaid ?? 1;
                const pct = Math.round((client.totalPaid / max) * 100);
                return (
                  <div key={client.clientId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-foreground font-medium">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        {client.clientName}
                      </span>
                      <MoneyText amount={client.totalPaid} className="text-xs" />
                    </div>
                    <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No paid invoices yet
            </div>
          )}
        </ChartCard>

        <ChartCard title="Upcoming Dues" subtitle="Invoices due in the next 30 days" loading={duesLoading}>
          {upcomingDues?.length ? (
            <div className="space-y-2">
              {upcomingDues.map((inv) => {
                const isOverdue   = inv.daysUntilDue < 0;
                const isUrgent    = inv.daysUntilDue >= 0 && inv.daysUntilDue <= 3;
                const isWarning   = inv.daysUntilDue > 3 && inv.daysUntilDue <= 7;
                const badgeColor  = isOverdue ? 'text-danger bg-danger/10' : isUrgent ? 'text-danger bg-danger/10' : isWarning ? 'text-warning bg-warning/10' : 'text-muted-foreground bg-surface';
                const dueLabel    = isOverdue
                  ? `${Math.abs(inv.daysUntilDue)}d overdue`
                  : inv.daysUntilDue === 0
                  ? 'Due today'
                  : `${inv.daysUntilDue}d left`;
                return (
                  <Link
                    key={inv.id}
                    href={`/app/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{inv.clientName}</p>
                      <p className="text-xs text-muted-foreground">{inv.number}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-2 shrink-0">
                      <MoneyText amount={inv.balance} className="text-sm font-medium" />
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', badgeColor)}>
                        {dueLabel}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No invoices due in the next 30 days
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
