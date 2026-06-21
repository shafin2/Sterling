'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus, Search, LayoutGrid, LayoutList, ExternalLink,
  Pencil, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { employeesApi, type Employee } from '@/lib/api/employees';
import { departmentsApi } from '@/lib/api/departments';
import { DataTable, checkboxColumn } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeDrawer } from './employee-drawer';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'cards';

function EmployeeAvatar({ employee }: { employee: Employee }) {
  const initials = `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase();
  return employee.avatar ? (
    <img src={employee.avatar} alt={employee.firstName} className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-white">
      {initials}
    </div>
  );
}

function EmployeesContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [deptFilter, setDeptFilter] = React.useState('');
  const [viewMode, setViewMode] = React.useState<ViewMode>('table');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);

  // Open new-employee drawer when ?new=1 is in the URL (e.g. from command palette)
  React.useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingEmployee(null);
      setDrawerOpen(true);
      router.replace('/app/employees');
    }
  }, [searchParams, router]);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, debouncedSearch, statusFilter, deptFilter],
    queryFn: () =>
      employeesApi.list({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        status: (statusFilter || undefined) as any,
        departmentId: deptFilter || undefined,
      }),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const columns: ColumnDef<Employee>[] = [
    checkboxColumn<Employee>(),
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original;
        return (
          <div className="flex items-center gap-3">
            <EmployeeAvatar employee={e} />
            <div>
              <Link
                href={`/app/employees/${e.id}`}
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {e.firstName} {e.lastName}
              </Link>
              <p className="text-xs text-muted">{e.code}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'jobTitle',
      header: 'Role',
      accessorKey: 'jobTitle',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted">{(getValue() as string) || '—'}</span>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <span className="text-sm text-muted">{row.original.department?.name || '—'}</span>
      ),
    },
    {
      id: 'joinDate',
      header: 'Joined',
      accessorKey: 'joinDate',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted">
          {new Date(getValue() as string).toLocaleDateString('en-PK', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
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
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingEmployee(row.original); setDrawerOpen(true); }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/app/employees/${row.original.id}`}>
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
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted">
            {data?.meta.total ?? 0} total employee{data?.meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'table' ? 'bg-primary text-white' : 'text-muted hover:text-foreground',
              )}
              aria-label="Table view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'cards' ? 'bg-primary text-white' : 'text-muted hover:text-foreground',
              )}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditingEmployee(null); setDrawerOpen(true); }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Employee
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
        >
          <option value="">All departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              isLoading={isLoading}
              totalPages={data?.meta.totalPages ?? 1}
              page={page}
              onPageChange={setPage}
              emptyState={
                <EmptyState
                  icon={Users}
                  title="No employees yet"
                  description="Add your first employee to start running payroll."
                  action={
                    <Button onClick={() => { setEditingEmployee(null); setDrawerOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> New Employee
                    </Button>
                  }
                />
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-2xl" />
                ))}
              </div>
            ) : data?.data.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No employees yet"
                description="Add your first employee to start running payroll."
                action={
                  <Button onClick={() => { setEditingEmployee(null); setDrawerOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> New Employee
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data?.data.map((emp, i) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group rounded-2xl border border-border bg-background p-5 hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <EmployeeAvatar employee={emp} />
                      <StatusBadge status={emp.status} />
                    </div>
                    <div className="mt-3">
                      <Link
                        href={`/app/employees/${emp.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {emp.firstName} {emp.lastName}
                      </Link>
                      <p className="text-xs text-muted">{emp.jobTitle || 'No title'}</p>
                      <p className="mt-1 text-xs text-muted/70">{emp.department?.name || 'No department'}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setEditingEmployee(emp); setDrawerOpen(true); }}
                      >
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/app/employees/${emp.id}`}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <EmployeeDrawer
        open={drawerOpen}
        employee={editingEmployee}
        departments={departments ?? []}
        onClose={() => { setDrawerOpen(false); setEditingEmployee(null); }}
      />
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <React.Suspense>
      <EmployeesContent />
    </React.Suspense>
  );
}
