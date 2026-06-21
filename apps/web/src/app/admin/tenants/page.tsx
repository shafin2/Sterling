'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, Eye, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, type AdminTenant } from '@/lib/admin-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-muted/20 text-muted-foreground border-muted/30',
  pro: 'bg-accent/20 text-accent border-accent/30',
  business: 'bg-primary/20 text-primary border-primary/30',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TenantActions({ tenant }: { tenant: AdminTenant }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const suspend = useMutation({
    mutationFn: () => adminApi.suspendTenant(tenant.id),
    onSuccess: () => {
      toast.success(`${tenant.name} suspended`);
      void qc.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      setOpen(false);
    },
    onError: () => toast.error('Failed to suspend tenant'),
  });

  const activate = useMutation({
    mutationFn: () => adminApi.activateTenant(tenant.id),
    onSuccess: () => {
      toast.success(`${tenant.name} activated`);
      void qc.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      setOpen(false);
    },
    onError: () => toast.error('Failed to activate tenant'),
  });

  const changePlan = useMutation({
    mutationFn: (plan: 'free' | 'pro' | 'business') => adminApi.updateTenantPlan(tenant.id, plan),
    onSuccess: (_, plan) => {
      toast.success(`Plan updated to ${plan}`);
      void qc.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
    onError: () => toast.error('Failed to update plan'),
  });

  return (
    <div ref={ref} className="relative flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
        className="h-7 px-2"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <select
        value={tenant.plan}
        onChange={(e) => changePlan.mutate(e.target.value as 'free' | 'pro' | 'business')}
        className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label="Change plan"
      >
        <option value="free">Free</option>
        <option value="pro">Pro</option>
        <option value="business">Business</option>
      </select>
      {tenant.isActive ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => suspend.mutate()}
          disabled={suspend.isPending}
          className="h-7 px-2 text-danger hover:bg-danger/10 hover:text-danger"
        >
          <Pause className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => activate.mutate()}
          disabled={activate.isPending}
          className="h-7 px-2 text-success hover:bg-success/10 hover:text-success"
        >
          <Play className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export default function AdminTenantsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  const page = Number(searchParams.get('page') ?? '1');

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tenants', page, debouncedSearch],
    queryFn: () => adminApi.getTenants({ page, limit: 20, search: debouncedSearch || undefined }),
    staleTime: 30_000,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tenants</h1>
          <p className="mt-1 text-muted-foreground">
            {data ? `${data.total.toLocaleString()} total` : 'Loading...'}
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Company</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Owner</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Members</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Invoices</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Last Active</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-5 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : data?.data.length ? (
                data.data.map((t) => (
                  <tr key={t.id} className="hover:bg-surface/50 transition-colors group">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/tenants/${t.id}`}
                        className="flex items-center gap-2.5 font-medium text-foreground hover:text-accent"
                      >
                        {t.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.logo} alt={t.name} className="h-7 w-7 rounded-md object-cover shrink-0" />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/20 text-xs font-bold text-primary">
                            {t.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{t.ownerEmail ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', PLAN_BADGE[t.plan] ?? 'border-border text-muted-foreground')}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">{t.memberCount}</td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">{t.invoiceCount}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {t.lastActiveAt ? fmtDate(t.lastActiveAt) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', t.isActive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
                        {t.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <TenantActions tenant={t} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-muted-foreground">
                    {debouncedSearch ? 'No tenants match your search' : 'No tenants yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
