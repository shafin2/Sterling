'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Building2, Pencil, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateDepartmentSchema, type CreateDepartmentDto } from '@sterling/shared';
import { departmentsApi, type Department } from '@/lib/api/departments';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Department | null>(null);

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.delete(id),
    onSuccess: () => {
      toast.success('Department deleted');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: () => toast.error('Failed to delete department'),
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-sm text-muted">{departments?.length ?? 0} departments</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Department
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : departments?.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Create departments to organise your employees."
          action={
            <Button onClick={() => { setEditing(null); setDrawerOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Department
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments?.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-2xl border border-border bg-background p-5 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditing(dept); setDrawerOpen(true); }}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this department?')) deleteMutation.mutate(dept.id);
                    }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-foreground">{dept.name}</h3>
                {dept.description && (
                  <p className="mt-0.5 text-sm text-muted line-clamp-2">{dept.description}</p>
                )}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                <Users className="h-3.5 w-3.5" />
                <span>{dept.employeeCount} employee{dept.employeeCount !== 1 ? 's' : ''}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <DepartmentDrawer
        open={drawerOpen}
        department={editing}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
      />
    </div>
  );
}

function DepartmentDrawer({
  open,
  department,
  onClose,
}: {
  open: boolean;
  department: Department | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!department;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateDepartmentDto>({
    resolver: zodResolver(CreateDepartmentSchema),
  });

  React.useEffect(() => {
    if (department) {
      reset({ name: department.name, description: department.description ?? '' });
    } else {
      reset({ name: '', description: '' });
    }
  }, [department, reset]);

  const save = useMutation({
    mutationFn: (dto: CreateDepartmentDto) =>
      isEdit ? departmentsApi.update(department!.id, dto) : departmentsApi.create(dto),
    onSuccess: () => {
      toast.success(isEdit ? 'Department updated' : 'Department created');
      qc.invalidateQueries({ queryKey: ['departments'] });
      onClose();
    },
    onError: () => toast.error('Failed to save department'),
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{isEdit ? 'Edit Department' : 'New Department'}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((dto) => save.mutate(dto))} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Name *</label>
                <input
                  {...register('name')}
                  placeholder="Engineering"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="What this department does…"
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" loading={save.isPending}>
                  {isEdit ? 'Save Changes' : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
