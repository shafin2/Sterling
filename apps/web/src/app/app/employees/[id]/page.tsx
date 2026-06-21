'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { use } from 'react';
import {
  ArrowLeft, Mail, Phone, Briefcase, Building2,
  Calendar, Pencil, Trash2, Plus, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { employeesApi, type SalaryStructure } from '@/lib/api/employees';
import { departmentsApi } from '@/lib/api/departments';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MoneyText } from '@/components/ui/money-text';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeDrawer } from '../employee-drawer';
import { SalaryEditor } from './salary-editor';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = React.useState(false);
  const [salaryOpen, setSalaryOpen] = React.useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id),
  });

  const { data: salaryHistory } = useQuery({
    queryKey: ['employee-salary-history', id],
    queryFn: () => employeesApi.getSalaryHistory(id),
  });

  const { data: currentSalary } = useQuery({
    queryKey: ['employee-current-salary', id],
    queryFn: () => employeesApi.getCurrentSalary(id),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: () => employeesApi.delete(id),
    onSuccess: () => {
      toast.success('Employee deleted');
      qc.invalidateQueries({ queryKey: ['employees'] });
      router.push('/app/employees');
    },
    onError: () => toast.error('Failed to delete employee'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!employee) return null;

  const grossSalary = currentSalary
    ? currentSalary.basicSalary +
      (currentSalary.allowances as { name: string; amount: number }[]).reduce((s, a) => s + a.amount, 0)
    : 0;

  const netSalary = currentSalary
    ? grossSalary -
      (currentSalary.deductions as { name: string; amount: number }[]).reduce((s, d) => s + d.amount, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/app/employees"><ArrowLeft className="mr-1 h-4 w-4" /> Employees</Link>
          </Button>
          <span className="text-muted">/</span>
          <span className="truncate font-semibold text-foreground">
            {employee.firstName} {employee.lastName}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            loading={deleteMutation.isPending}
            onClick={() => {
              if (confirm('Delete this employee?')) deleteMutation.mutate();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Profile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-background p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-xl font-bold text-white">
                {employee.firstName[0]}{employee.lastName[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">
                    {employee.firstName} {employee.lastName}
                  </h1>
                  <StatusBadge status={employee.status} />
                </div>
                <p className="text-sm text-muted">{employee.jobTitle || 'No title'}</p>
                <p className="text-xs text-muted/70 font-mono">{employee.code}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {employee.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted" />
                  <span className="text-sm text-foreground">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted" />
                  <span className="text-sm text-foreground">{employee.phone}</span>
                </div>
              )}
              {employee.department && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted" />
                  <span className="text-sm text-foreground">{employee.department.name}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted" />
                <span className="text-sm text-foreground">
                  Joined {new Date(employee.joinDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Current Salary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-background p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted" />
                <h3 className="font-semibold text-foreground">Current Salary Structure</h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSalaryOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                {currentSalary ? 'Update' : 'Set Salary'}
              </Button>
            </div>

            {currentSalary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <SalaryCard label="Basic" amount={currentSalary.basicSalary} />
                  <SalaryCard label="Gross" amount={grossSalary} highlight />
                  <SalaryCard label="Net Pay" amount={netSalary} highlight />
                </div>

                {(currentSalary.allowances as { name: string; amount: number }[]).length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">Allowances</p>
                    {(currentSalary.allowances as { name: string; amount: number }[]).map((a) => (
                      <div key={a.name} className="flex justify-between py-1 text-sm">
                        <span className="text-muted">{a.name}</span>
                        <MoneyText amount={a.amount} currency="PKR" className="text-success" />
                      </div>
                    ))}
                  </div>
                )}

                {(currentSalary.deductions as { name: string; amount: number }[]).length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">Deductions</p>
                    {(currentSalary.deductions as { name: string; amount: number }[]).map((d) => (
                      <div key={d.name} className="flex justify-between py-1 text-sm">
                        <span className="text-muted">{d.name}</span>
                        <MoneyText amount={d.amount} currency="PKR" className="text-danger" />
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted">
                  Effective from {new Date(currentSalary.effectiveDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted">
                No salary structure set.{' '}
                <button onClick={() => setSalaryOpen(true)} className="text-primary hover:underline">
                  Set one now
                </button>
              </div>
            )}
          </motion.div>

          {/* Salary History */}
          {salaryHistory && salaryHistory.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted" />
                <h3 className="font-semibold text-foreground">Salary History</h3>
              </div>
              <div className="space-y-3">
                {salaryHistory.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        <MoneyText amount={s.basicSalary} currency="PKR" /> basic
                      </p>
                      <p className="text-xs text-muted">
                        From {new Date(s.effectiveDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {s.isCurrent && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Current</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Meta sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-background p-6 space-y-4 h-fit"
        >
          <h3 className="font-semibold text-foreground">Details</h3>
          <MetaRow label="Code" value={<span className="font-mono text-xs">{employee.code}</span>} />
          <MetaRow label="Status" value={<StatusBadge status={employee.status} />} />
          <MetaRow label="Department" value={employee.department?.name ?? '—'} />
          <MetaRow label="Job Title" value={employee.jobTitle ?? '—'} />
          <MetaRow
            label="Joined"
            value={new Date(employee.joinDate).toLocaleDateString('en-PK', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          />
        </motion.div>
      </div>

      <EmployeeDrawer
        open={editOpen}
        employee={employee}
        departments={departments ?? []}
        onClose={() => {
          setEditOpen(false);
          qc.invalidateQueries({ queryKey: ['employee', id] });
        }}
      />

      <SalaryEditor
        open={salaryOpen}
        employeeId={id}
        current={currentSalary ?? null}
        onClose={() => {
          setSalaryOpen(false);
          qc.invalidateQueries({ queryKey: ['employee-current-salary', id] });
          qc.invalidateQueries({ queryKey: ['employee-salary-history', id] });
        }}
      />
    </div>
  );
}

function SalaryCard({ label, amount, highlight }: { label: string; amount: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-primary/5 border border-primary/20' : 'bg-surface'}`}>
      <p className="text-xs text-muted mb-1">{label}</p>
      <MoneyText amount={amount} currency="PKR" className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-foreground'}`} />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
