'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { teamsApi, type Role } from '@/lib/api/teams';

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  accountant: 'Accountant',
  hr: 'HR Manager',
  viewer: 'Viewer',
};

const NewUserSchema = z.object({
  firstName: z.string().min(1, 'Required').max(50),
  lastName: z.string().min(1, 'Required').max(50),
  password: z.string().min(8, 'At least 8 characters').max(128),
});
type NewUserForm = z.infer<typeof NewUserSchema>;

function RoleBadge({ role }: { role: Role }) {
  const colorMap: Record<Role, string> = {
    owner: 'bg-primary/15 text-primary',
    admin: 'bg-accent/15 text-accent',
    accountant: 'bg-warning/15 text-warning',
    hr: 'bg-success/15 text-success',
    viewer: 'bg-muted/20 text-muted-foreground',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorMap[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function InvitePageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [showPwd, setShowPwd] = React.useState(false);

  const {
    data: info,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invite-info', token],
    queryFn: () => teamsApi.getInviteInfo(token),
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: (dto: {
      token: string;
      firstName?: string;
      lastName?: string;
      password?: string;
    }) => teamsApi.acceptInvite(dto),
    onSuccess: () => {
      toast.success('Welcome to the team!');
      router.push('/app');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to accept invite';
      toast.error(msg);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewUserForm>({ resolver: zodResolver(NewUserSchema) });

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-warning" />
        <h2 className="text-lg font-semibold text-foreground">Invalid link</h2>
        <p className="mt-2 text-sm text-muted-foreground">This invite link is missing a token.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your invitation...</p>
      </div>
    );
  }

  if (isError || !info) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-danger" />
        <h2 className="text-lg font-semibold text-foreground">Invite not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This invite link is invalid or has been revoked.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/auth/login')}>
          Go to sign in
        </Button>
      </div>
    );
  }

  if (info.expired) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-warning" />
        <h2 className="text-lg font-semibold text-foreground">Invite expired</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This invitation has expired. Ask your team admin to send a new one.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/auth/login')}>
          Go to sign in
        </Button>
      </div>
    );
  }

  if (info.accepted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
        <h2 className="text-lg font-semibold text-foreground">Already accepted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This invitation has already been accepted. Sign in to access your workspace.
        </p>
        <Button className="mt-5" onClick={() => router.push('/auth/login')}>
          Sign in
        </Button>
      </div>
    );
  }

  const onNewUserSubmit = (form: NewUserForm) => {
    acceptMutation.mutate({ token, ...form });
  };

  const onExistingUserAccept = () => {
    acceptMutation.mutate({ token });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sterling</h1>
          <p className="mt-1 text-sm text-muted-foreground">Invoice & Payroll, refined.</p>
        </div>
      </div>

      {/* Invite card */}
      <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Join {info.tenantName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You've been invited to join as
            </p>
            <div className="mt-2">
              <RoleBadge role={info.role} />
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-surface/40 p-4">
          <p className="text-sm text-muted-foreground">
            Invited email:{' '}
            <strong className="text-foreground">{info.email}</strong>
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Create your account to continue</p>
          <p className="-mt-2 text-xs text-muted-foreground">
            Already have a Sterling account?{' '}
            <button
              type="button"
              onClick={onExistingUserAccept}
              disabled={acceptMutation.isPending}
              className="text-accent hover:underline disabled:opacity-50"
            >
              Accept with existing account
            </button>
          </p>

          <form onSubmit={handleSubmit(onNewUserSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">First name</label>
                <Input
                  {...register('firstName')}
                  placeholder="Jane"
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p className="text-xs text-danger">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Last name</label>
                <Input
                  {...register('lastName')}
                  placeholder="Smith"
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p className="text-xs text-danger">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input value={info.email} disabled className="opacity-60" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={acceptMutation.isPending}
            >
              Accept invitation & create account
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <InvitePageContent />
    </Suspense>
  );
}
