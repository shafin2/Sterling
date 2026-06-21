'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Building2, Activity, Users, FileText, TrendingUp, TrendingDown,
} from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PRIMARY  = '#3D52A0';
const ACCENT   = '#7091E6';
const MUTED    = '#8697C4';

const PLAN_COLORS: Record<string, string> = {
  free: MUTED,
  pro: ACCENT,
  business: PRIMARY,
};

function useCountUp(target: number, duration = 900) {
  const [current, setCurrent] = React.useState(0);
  React.useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    let startTime: number | null = null;
    let rafId = 0;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(ease * target));
      if (progress < 1) { rafId = requestAnimationFrame(step); }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return current;
}

function KpiCard({
  label, value, icon: Icon, trend, color = 'text-primary', loading,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number | null;
  color?: string;
  loading?: boolean;
}) {
  const animated = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
          <Icon className={cn('h-4 w-4', color)} />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-16" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold tabular-nums text-foreground">{animated.toLocaleString()}</div>
          {trend != null && (
            <div className={cn('mt-1 flex items-center gap-1 text-xs font-medium', trend >= 0 ? 'text-success' : 'text-danger')}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)}% vs last month
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

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

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-muted/20 text-muted-foreground',
  pro: 'bg-accent/20 text-accent',
  business: 'bg-primary/20 text-primary',
};

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    staleTime: 60_000,
  });

  const { data: signups, isLoading: signupsLoading } = useQuery({
    queryKey: ['admin', 'signups'],
    queryFn: () => adminApi.getSignups(8),
    staleTime: 60_000,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: adminApi.getPlans,
    staleTime: 60_000,
  });

  const { data: tenantsRes, isLoading: tenantsLoading } = useQuery({
    queryKey: ['admin', 'tenants', 1],
    queryFn: () => adminApi.getTenants({ page: 1, limit: 10 }),
    staleTime: 60_000,
  });

  const trend = stats && stats.newTenantsLastMonth > 0
    ? Math.round(((stats.newTenantsThisMonth - stats.newTenantsLastMonth) / stats.newTenantsLastMonth) * 100)
    : null;

  const planData = plans
    ? Object.entries(plans).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Overview</h1>
        <p className="mt-1 text-muted-foreground">Cross-tenant administration dashboard</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Tenants"
          value={stats?.totalTenants ?? 0}
          icon={Building2}
          color="text-primary"
          trend={trend}
          loading={statsLoading}
        />
        <KpiCard
          label="New This Month"
          value={stats?.newTenantsThisMonth ?? 0}
          icon={Activity}
          color="text-accent"
          loading={statsLoading}
        />
        <KpiCard
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          color="text-muted-foreground"
          loading={statsLoading}
        />
        <KpiCard
          label="Total Invoices"
          value={stats?.totalInvoices ?? 0}
          icon={FileText}
          color="text-success"
          loading={statsLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="New Signups"
          subtitle="Tenant signups by week (last 8 weeks)"
          loading={signupsLoading}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={signups ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Area
                type="monotone" dataKey="count" name="Signups"
                stroke={PRIMARY} fill="url(#signupGrad)" strokeWidth={2} dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Plan Breakdown" subtitle="Active tenants by plan" loading={plansLoading}>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={planData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                >
                  {planData.map((entry) => (
                    <Cell key={entry.name} fill={PLAN_COLORS[entry.name.toLowerCase()] ?? MUTED} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No data yet</div>
          )}
        </ChartCard>
      </div>

      {/* Recent tenants table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Tenants</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest 10 signups</p>
          </div>
          <Link href="/admin/tenants" className="text-xs text-accent hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          {tenantsLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Company</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Owner</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Created</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantsRes?.data.length ? (
                  tenantsRes.data.map((t) => (
                    <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/admin/tenants/${t.id}`} className="font-medium text-foreground hover:text-accent">
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{t.ownerEmail ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', PLAN_BADGE[t.plan] ?? 'bg-surface text-muted-foreground')}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">
                        {fmtDate(t.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', t.isActive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
                          {t.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No tenants yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
