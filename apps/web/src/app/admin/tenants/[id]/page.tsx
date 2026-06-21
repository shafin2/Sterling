'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, FileText, Clock, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/admin-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-muted/20 text-muted-foreground border-muted/30',
  pro: 'bg-accent/20 text-accent border-accent/30',
  business: 'bg-primary/20 text-primary border-primary/30',
};

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-primary/20 text-primary',
  admin: 'bg-accent/20 text-accent',
  accountant: 'bg-warning/20 text-warning',
  hr: 'bg-success/20 text-success',
  viewer: 'bg-muted/20 text-muted-foreground',
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<'members' | 'activity'>('members');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin', 'tenant', id],
    queryFn: () => adminApi.getTenantDetail(id),
    staleTime: 30_000,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin', 'tenant', id, 'activity'],
    queryFn: () => adminApi.getTenantActivity(id, 50),
    enabled: tab === 'activity',
    staleTime: 30_000,
  });

  const suspend = useMutation({
    mutationFn: () => adminApi.suspendTenant(id),
    onSuccess: () => {
      toast.success('Tenant suspended');
      void qc.invalidateQueries({ queryKey: ['admin', 'tenant', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
  });

  const activate = useMutation({
    mutationFn: () => adminApi.activateTenant(id),
    onSuccess: () => {
      toast.success('Tenant activated');
      void qc.invalidateQueries({ queryKey: ['admin', 'tenant', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
  });

  const changePlan = useMutation({
    mutationFn: (plan: 'free' | 'pro' | 'business') => adminApi.updateTenantPlan(id, plan),
    onSuccess: (_, plan) => {
      toast.success(`Plan updated to ${plan}`);
      void qc.invalidateQueries({ queryKey: ['admin', 'tenant', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Tenant not found.</p>
        <Link href="/admin/tenants" className="mt-2 text-accent hover:underline text-sm">← Back to tenants</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/tenants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to tenants
      </Link>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="flex flex-wrap items-start gap-4">
          {tenant.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo} alt={tenant.name} className="h-14 w-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-xl font-bold text-white">
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', PLAN_BADGE[tenant.plan] ?? 'border-border text-muted-foreground')}>
                {tenant.plan}
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', tenant.isActive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
                {tenant.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Slug: <span className="font-mono">{tenant.slug}</span>
              {tenant.ownerEmail && <span className="ml-3">Owner: {tenant.ownerEmail}</span>}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Joined {fmtDate(tenant.createdAt)}
              {tenant.suspendedAt && (
                <span className="ml-3 text-danger">Suspended {fmtDateShort(tenant.suspendedAt)}</span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tenant.plan}
              onChange={(e) => changePlan.mutate(e.target.value as 'free' | 'pro' | 'business')}
              disabled={changePlan.isPending}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
            {tenant.isActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => suspend.mutate()}
                disabled={suspend.isPending}
                className="border-danger/30 text-danger hover:bg-danger/10"
              >
                <Pause className="h-4 w-4 mr-1.5" /> Suspend
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => activate.mutate()}
                disabled={activate.isPending}
                className="border-success/30 text-success hover:bg-success/10"
              >
                <Play className="h-4 w-4 mr-1.5" /> Activate
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Members', value: String(tenant.members?.length ?? 0), icon: Users },
          { label: 'Invoices Generated', value: String(tenant.invoiceCountLive), icon: FileText },
          { label: 'Last Active', value: tenant.lastActiveAt ? timeAgo(tenant.lastActiveAt) : 'Never', icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Icon className="h-4 w-4" /> {label}
            </div>
            <div className="font-bold text-xl text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border flex">
          {(['members', 'activity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-3 text-sm font-medium capitalize transition-colors',
                tab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'members' && (
            <div className="divide-y divide-border">
              {tenant.members?.length ? (
                tenant.members.map((m) => (
                  <div key={m.userId} className="flex items-center gap-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {(m.firstName?.charAt(0) ?? m.email?.charAt(0) ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', ROLE_BADGE[m.role] ?? 'bg-surface text-muted-foreground')}>
                      {m.role}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {fmtDateShort(m.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">No members found</div>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-3">
              {activityLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : activity?.length ? (
                activity.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-border/50 px-4 py-3">
                    <div className="h-2 w-2 mt-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium capitalize">{entry.action}</span>
                        {' '}on{' '}
                        <span className="font-mono text-xs text-accent">{entry.resource}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.userEmail ?? 'System'} · {timeAgo(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">No activity recorded yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
