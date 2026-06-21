'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, Search, Filter, ChevronLeft, ChevronRight,
  User, Clock, MousePointerClick,
} from 'lucide-react';
import { auditLogsApi, type AuditLogEntry } from '@/lib/api/audit-logs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function actionColor(action: string) {
  if (action.startsWith('DELETE') || action.includes('delete')) return 'text-danger bg-danger/10';
  if (action.startsWith('POST') || action.includes('create')) return 'text-success bg-success/10';
  if (action.startsWith('PATCH') || action.startsWith('PUT') || action.includes('update')) return 'text-warning bg-warning/10';
  return 'text-accent bg-accent/10';
}

function ActionBadge({ action }: { action: string }) {
  const label = action.length > 40 ? action.slice(0, 40) + '…' : action;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-medium ${actionColor(action)}`}>
      {label}
    </span>
  );
}

function resourceLabel(resource: string) {
  return resource
    .replace(/^\/api\/v1\//, '')
    .replace(/\//g, ' › ')
    .replace(/-/g, ' ');
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function LogRow({ entry, index }: { entry: AuditLogEntry; index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="border-b border-border hover:bg-surface/30 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System'}
            </p>
            <p className="text-xs text-muted-foreground">{entry.user?.email ?? '—'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <ActionBadge action={entry.action} />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground capitalize">{resourceLabel(entry.resource)}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground font-mono">{entry.ipAddress ?? '—'}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs text-muted-foreground" title={entry.createdAt}>
          {formatRelative(entry.createdAt)}
        </span>
      </td>
    </motion.tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [resource, setResource] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');

  const { data: resources = [] } = useQuery({
    queryKey: ['audit-logs', 'resources'],
    queryFn: () => auditLogsApi.resources(),
    staleTime: 300_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search, resource],
    queryFn: () =>
      auditLogsApi.list({ page, limit: 50, search: search || undefined, resource: resource || undefined }),
    staleTime: 30_000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Logs</h1>
          <p className="mt-1 text-muted-foreground">
            A complete record of all actions taken in your workspace.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-border">
          <Shield className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput((e.target as HTMLInputElement).value)}
              placeholder="Search actions, resources, users…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
        </form>

        {resources.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={resource}
              onChange={(e) => { setResource((e.target as HTMLSelectElement).value); setPage(1); }}
              className="h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="">All resources</option>
              {resources.map((r) => (
                <option key={r} value={r} className="capitalize">{resourceLabel(r)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {data && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {data.meta.total.toLocaleString()} events
          {search && <> matching &ldquo;{search}&rdquo;</>}
          {resource && <> in &ldquo;{resourceLabel(resource)}&rdquo;</>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">When</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-3" colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : data?.data.length === 0
                ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <MousePointerClick className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No activity found.</p>
                      {search && (
                        <button
                          onClick={() => { setSearch(''); setSearchInput(''); }}
                          className="mt-2 text-xs text-accent underline"
                        >
                          Clear search
                        </button>
                      )}
                    </td>
                  </tr>
                )
                : data?.data.map((entry, i) => (
                  <LogRow key={entry.id} entry={entry} index={i} />
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Page {data?.meta.page ?? 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm" variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
