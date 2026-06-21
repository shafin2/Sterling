'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus, Search, Upload, Trash2,
  Building2, User, ExternalLink, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { clientsApi, type Client } from '@/lib/api/clients';
import { DataTable, checkboxColumn } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ClientDrawer } from './client-drawer';
import { ClientCsvImport } from './client-csv-import';
import Link from 'next/link';

function ClientsContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'inactive' | ''>('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Open new-client drawer when ?new=1 is in the URL (e.g. from command palette)
  React.useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingClient(null);
      setDrawerOpen(true);
      router.replace('/app/clients');
    }
  }, [searchParams, router]);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page, debouncedSearch, statusFilter],
    queryFn: () =>
      clientsApi.list({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      }),
  });

  const bulkDelete = useMutation({
    mutationFn: () => clientsApi.bulkDelete(selectedIds),
    onSuccess: () => {
      toast.success(`${selectedIds.length} client(s) deleted`);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: () => toast.error('Failed to delete clients'),
  });

  const columns: ColumnDef<Client>[] = [
    checkboxColumn<Client>(),
    {
      id: 'name',
      header: 'Client',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {row.original.type === 'company' ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          <div>
            <Link
              href={`/app/clients/${row.original.id}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {row.original.name}
            </Link>
            {row.original.email && (
              <p className="text-xs text-muted">{row.original.email}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      accessorKey: 'phone',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted">{(getValue() as string) || '—'}</span>
      ),
    },
    {
      id: 'currency',
      header: 'Currency',
      accessorKey: 'currency',
      cell: ({ getValue }) => (
        <span className="rounded bg-surface px-2 py-0.5 text-xs font-mono font-medium">
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingClient(row.original); setDrawerOpen(true); }}
            aria-label="Edit client"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" asChild aria-label="View client">
            <Link href={`/app/clients/${row.original.id}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted">
            {data?.meta.total ?? 0} total client{data?.meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => bulkDelete.mutate()}
              loading={bulkDelete.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedIds.length}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditingClient(null); setDrawerOpen(true); }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as '' | 'active' | 'inactive'); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        totalPages={data?.meta.totalPages ?? 1}
        page={page}
        onPageChange={setPage}
        onRowSelectionChange={(sel) =>
          setSelectedIds(
            Object.keys(sel)
              .filter((k) => sel[k])
              .map((i) => data?.data[parseInt(i)]?.id ?? '')
              .filter(Boolean),
          )
        }
        emptyState={
          <EmptyState
            icon={Building2}
            title="No clients yet"
            description="Add your first client to start creating invoices."
            action={
              <Button onClick={() => { setEditingClient(null); setDrawerOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> New Client
              </Button>
            }
          />
        }
      />

      <ClientDrawer
        open={drawerOpen}
        client={editingClient}
        onClose={() => { setDrawerOpen(false); setEditingClient(null); }}
      />
      <ClientCsvImport open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

export default function ClientsPage() {
  return (
    <React.Suspense>
      <ClientsContent />
    </React.Suspense>
  );
}
