'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Percent, Plus, Trash2, Edit2, Check, X,
  Globe, Phone, MapPin, Receipt, Upload, Image as ImageIcon,
  Users, Mail, CreditCard, Zap, Crown, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { taxRulesApi, bpsToPercent, percentToBps, type TaxRule } from '@/lib/api/tax-rules';
import { teamsApi, type Role } from '@/lib/api/teams';
import { stripeApi, type SubscriptionStatus } from '@/lib/api/stripe';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// ─── Types & schemas ──────────────────────────────────────────────────────────

interface TenantProfile {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  currency: string;
  taxId: string | null;
}

const ProfileSchema = z.object({
  name: z.string().min(1, 'Required'),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  currency: z.string().max(10).optional(),
  taxId: z.string().max(50).optional(),
});
type ProfileForm = z.infer<typeof ProfileSchema>;

const TaxRuleSchema = z.object({
  name: z.string().min(1, 'Required'),
  ratePercent: z.number().min(0).max(1000),
  appliesTo: z.enum(['invoice', 'payroll', 'both']),
});
type TaxRuleForm = z.infer<typeof TaxRuleSchema>;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const SETTINGS_NAV = [
  {
    group: 'Workspace',
    items: [
      { id: 'company', label: 'Company Profile', icon: Building2, description: 'Name, logo, contact info' },
      { id: 'tax', label: 'Tax Rules', icon: Percent, description: 'Configure tax rates and rules' },
    ],
  },
  {
    group: 'People',
    items: [
      { id: 'team', label: 'Team & Access', icon: Users, description: 'Members, roles and invitations' },
    ],
  },
  {
    group: 'Account',
    items: [
      { id: 'billing', label: 'Billing & Plans', icon: CreditCard, description: 'Subscription and usage' },
    ],
  },
];

// ─── Company Profile Tab ──────────────────────────────────────────────────────

function CompanyProfileTab() {
  const qc = useQueryClient();
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoChanged, setLogoChanged] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get('tenants/me').json<TenantProfile>(),
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
  });

  React.useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        website: profile.website ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
        country: profile.country ?? 'Pakistan',
        currency: profile.currency ?? 'PKR',
        taxId: profile.taxId ?? '',
      });
      setLogoPreview(profile.logo ?? null);
      setLogoChanged(false);
    }
  }, [profile, reset]);

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error('Logo must be under 500 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
      setLogoChanged(true);
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setLogoPreview(null);
    setLogoChanged(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const saveMutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      api.patch('tenants/me', {
        json: { ...data, ...(logoChanged && { logo: logoPreview }) },
      }).json<TenantProfile>(),
    onSuccess: (updated) => {
      qc.setQueryData(['tenant', 'me'], updated);
      setLogoChanged(false);
      toast.success('Company profile saved');
    },
    onError: () => toast.error('Failed to save profile'),
  });

  const fields = [
    { name: 'name' as const, label: 'Company name', icon: Building2, placeholder: 'Acme Corp' },
    { name: 'taxId' as const, label: 'Tax / NTN number', icon: Receipt, placeholder: '1234567-8' },
    { name: 'website' as const, label: 'Website', icon: Globe, placeholder: 'https://acme.com' },
    { name: 'phone' as const, label: 'Phone', icon: Phone, placeholder: '+92 300 0000000' },
    { name: 'city' as const, label: 'City', icon: MapPin, placeholder: 'Karachi' },
    { name: 'country' as const, label: 'Country', icon: MapPin, placeholder: 'Pakistan' },
    { name: 'currency' as const, label: 'Default currency', icon: Receipt, placeholder: 'PKR' },
  ];

  return (
    <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Company Profile</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            This information appears on all invoices and salary slips.
          </p>
        </div>

        {/* Logo upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Company Logo</label>
          <p className="text-xs text-muted-foreground">Appears on invoices and salary slips. Max 500 KB (PNG, JPG, SVG).</p>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 overflow-hidden">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : logoPreview ? (
                <img src={logoPreview} alt="Company logo" className="h-full w-full object-contain p-2" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoFile}
                className="hidden"
                id="logo-upload"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                Upload logo
              </Button>
              {logoPreview && (
                <Button type="button" variant="ghost" size="sm" onClick={clearLogo} className="text-danger hover:text-danger">
                  <X className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(({ name, label, placeholder }) => (
            <div key={name} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{label}</label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input
                  {...register(name)}
                  placeholder={placeholder}
                  className={errors[name] ? 'border-danger' : ''}
                />
              )}
              {errors[name] && (
                <p className="text-xs text-danger">{errors[name]?.message}</p>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Address</label>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <textarea
              {...register('address')}
              rows={3}
              placeholder="123 Main Street, City, Country"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          )}
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <Button
            type="submit"
            loading={saveMutation.isPending}
            disabled={!isDirty && !logoChanged}
          >
            <Check className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Tax Rules Tab ────────────────────────────────────────────────────────────

function TaxRulesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['tax-rules'],
    queryFn: () => taxRulesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: TaxRuleForm) =>
      taxRulesApi.create({
        name: data.name,
        rateBps: percentToBps(data.ratePercent),
        appliesTo: data.appliesTo,
        isActive: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-rules'] });
      setShowCreate(false);
      toast.success('Tax rule created');
    },
    onError: () => toast.error('Failed to create tax rule'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaxRuleForm }) =>
      taxRulesApi.update(id, {
        name: data.name,
        rateBps: percentToBps(data.ratePercent),
        appliesTo: data.appliesTo,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-rules'] });
      setEditing(null);
      toast.success('Tax rule updated');
    },
    onError: () => toast.error('Failed to update tax rule'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      taxRulesApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-rules'] }),
    onError: () => toast.error('Failed to update tax rule'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taxRulesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-rules'] });
      toast.success('Tax rule deleted');
    },
    onError: () => toast.error('Failed to delete tax rule'),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Tax Rules</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure tax rates applied to invoices and payroll.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Add rule
        </Button>
      </div>

      {showCreate && (
        <TaxRuleForm
          onSubmit={(d) => createMutation.mutate(d)}
          onCancel={() => setShowCreate(false)}
          loading={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : rules.length === 0 && !showCreate ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Percent className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tax rules configured.</p>
          <p className="text-xs text-muted-foreground mt-1">Add a rule to apply GST, VAT, or income tax.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {editing === rule.id ? (
                <TaxRuleForm
                  defaultValues={{
                    name: rule.name,
                    ratePercent: rule.rateBps / 100,
                    appliesTo: rule.appliesTo,
                  }}
                  onSubmit={(d) => updateMutation.mutate({ id: rule.id, data: d })}
                  onCancel={() => setEditing(null)}
                  loading={updateMutation.isPending}
                />
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                      className={[
                        'h-5 w-9 rounded-full transition-colors relative',
                        rule.isActive ? 'bg-primary' : 'bg-muted/40',
                      ].join(' ')}
                    >
                      <span className={[
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                        rule.isActive ? 'translate-x-4' : 'translate-x-0.5',
                      ].join(' ')} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-foreground">{rule.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {bpsToPercent(rule.rateBps)} · applies to {rule.appliesTo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(rule.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(rule.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaxRuleForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading,
}: {
  defaultValues?: Partial<TaxRuleForm>;
  onSubmit: (d: TaxRuleForm) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<TaxRuleForm>({
    resolver: zodResolver(TaxRuleSchema),
    defaultValues: defaultValues ?? { appliesTo: 'invoice', ratePercent: 0 },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-accent/30 bg-surface/40 p-4 space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input {...register('name')} placeholder="GST 15%" />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Rate (%)</label>
          <Input
            {...register('ratePercent', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="0"
            max="1000"
            placeholder="15"
          />
          {errors.ratePercent && <p className="text-xs text-danger">Invalid rate</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Applies to</label>
          <select
            {...register('appliesTo')}
            className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="invoice">Invoice</option>
            <option value="payroll">Payroll</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </form>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

const roleColors: Record<Role, string> = {
  owner: 'bg-primary/15 text-primary',
  admin: 'bg-accent/15 text-accent',
  accountant: 'bg-warning/15 text-warning',
  hr: 'bg-success/15 text-success',
  viewer: 'bg-muted/20 text-muted-foreground',
};

const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  accountant: 'Accountant',
  hr: 'HR',
  viewer: 'Viewer',
};

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

// Simple modal dialog using AnimatePresence pattern already in the codebase
function InviteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<Role>('viewer');
  const [error, setError] = React.useState('');

  const inviteMutation = useMutation({
    mutationFn: (dto: { email: string; role: Role }) => teamsApi.createInvite(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', 'invites'] });
      setEmail('');
      setRole('viewer');
      setError('');
      toast.success('Invitation sent');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to send invite';
      setError(msg);
    },
  });

  function handleSend() {
    setError('');
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    inviteMutation.mutate({ email, role });
  }

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-dialog-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 id="invite-dialog-title" className="text-base font-semibold text-foreground">
              Invite a team member
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="viewer">Viewer — read-only access</option>
                <option value="accountant">Accountant — invoices &amp; payroll</option>
                <option value="hr">HR Manager — employees &amp; payroll</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} loading={inviteMutation.isPending}>
                Send invite
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TeamTab() {
  const qc = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);
  const [removingUserId, setRemovingUserId] = React.useState<string | null>(null);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['team', 'members'],
    queryFn: () => teamsApi.getMembers(),
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['team', 'invites'],
    queryFn: () => teamsApi.getPendingInvites(),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      teamsApi.updateMemberRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', 'members'] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => teamsApi.removeMember(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', 'members'] });
      setRemovingUserId(null);
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => teamsApi.resendInvite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', 'invites'] });
      toast.success('Invite resent');
    },
    onError: () => toast.error('Failed to resend invite'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => teamsApi.cancelInvite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', 'invites'] });
      toast.success('Invite cancelled');
    },
    onError: () => toast.error('Failed to cancel invite'),
  });

  return (
    <div className="space-y-6">
      {/* Members section */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Team Members</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage who has access to your workspace.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowInviteDialog(true)}>
            <Plus className="h-4 w-4" />
            Invite member
          </Button>
        </div>

        {membersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <motion.div
                key={member.userId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 py-3"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-primary">
                      {getInitials(member.firstName, member.lastName)}
                    </span>
                  )}
                </div>

                {/* Name / email */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>

                {/* Role pill */}
                <span
                  className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColors[member.role]}`}
                >
                  {roleLabels[member.role]}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {member.role !== 'owner' && (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateRoleMutation.mutate({
                          userId: member.userId,
                          role: e.target.value as Role,
                        })
                      }
                      className="h-8 rounded-lg border border-border bg-input px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      aria-label="Change role"
                    >
                      <option value="admin">Admin</option>
                      <option value="accountant">Accountant</option>
                      <option value="hr">HR</option>
                      <option value="viewer">Viewer</option>
                      <option value="owner">Owner</option>
                    </select>
                  )}
                  <button
                    onClick={() => setRemovingUserId(member.userId)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-danger transition-colors"
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {(invites.length > 0 || invitesLoading) && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pending Invitations</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              These users have been invited but haven&apos;t accepted yet.
            </p>
          </div>

          {invitesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => (
                <motion.div
                  key={invite.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface/30 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/20">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited by {invite.invitedBy} · Expires{' '}
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColors[invite.role]}`}
                  >
                    {roleLabels[invite.role]}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => resendMutation.mutate(invite.id)}
                      disabled={resendMutation.isPending}
                      className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors disabled:opacity-50"
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate(invite.id)}
                      disabled={cancelMutation.isPending}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-danger transition-colors disabled:opacity-50"
                      aria-label="Cancel invite"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite dialog */}
      <InviteDialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />

      {/* Remove member confirm dialog */}
      <ConfirmDialog
        open={!!removingUserId}
        title="Remove team member?"
        description="This person will lose access to the workspace immediately. You can re-invite them later."
        confirmLabel="Remove"
        variant="danger"
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (removingUserId) removeMutation.mutate(removingUserId);
        }}
        onCancel={() => setRemovingUserId(null)}
      />
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    priceNote: 'forever',
    icon: Zap,
    popular: false,
    features: ['5 invoices / month', '1 team member', 'Basic PDF templates', 'Email support'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$29',
    priceNote: 'per month',
    icon: Crown,
    popular: true,
    features: ['Unlimited invoices', 'Up to 5 team members', 'Custom invoice designer', 'AI financial assistant', 'Payment reminders', 'Priority support'],
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '$79',
    priceNote: 'per month',
    icon: Crown,
    popular: false,
    features: ['Everything in Pro', 'Unlimited team members', 'Advanced analytics & exports', 'Dedicated SLA', 'Onboarding & training', 'Dedicated account manager'],
  },
];

function BillingTab() {
  const [loading, setLoading] = React.useState<string | null>(null);

  const { data: status, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['stripe', 'status'],
    queryFn: () => stripeApi.getStatus(),
    retry: false,
  });

  async function handleUpgrade(plan: 'pro' | 'enterprise') {
    setLoading(plan);
    try {
      const { url } = await stripeApi.createCheckoutSession(plan);
      window.location.href = url;
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading('portal');
    try {
      const { url } = await stripeApi.createPortalSession();
      window.location.href = url;
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setLoading(null);
    }
  }

  const currentPlan = status?.plan ?? 'free';

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-foreground capitalize">{currentPlan}</span>
                {currentPlan !== 'free' && status?.currentPeriodEnd && (
                  <span className="text-xs text-muted-foreground">
                    · renews {new Date(status.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
                {status?.cancelAtPeriodEnd && (
                  <span className="text-xs text-warning font-medium">· cancels at period end</span>
                )}
              </div>
            )}
          </div>
          {currentPlan !== 'free' && (
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={loading === 'portal'}>
              {loading === 'portal' ? 'Opening…' : 'Manage subscription'}
            </Button>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPro = plan.popular;
          const Icon = plan.icon;
          const isFree = plan.id === 'free';
          return (
            <div
              key={plan.id}
              className={[
                'relative flex flex-col rounded-2xl border p-6 transition-all duration-200 overflow-visible',
                isPro
                  ? 'border-2 border-primary/60 bg-gradient-to-b from-primary/5 to-accent/5 shadow-xl shadow-primary/10 scale-[1.02]'
                  : isCurrent
                    ? 'border-primary/40 bg-primary/5 shadow-md'
                    : 'border-border bg-card hover:border-accent/40 hover:shadow-lg',
                isFree ? 'opacity-85' : '',
              ].join(' ')}
            >
              {/* Most Popular badge */}
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold px-4 py-1 rounded-full shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current plan checkmark */}
              {isCurrent && !isPro && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              )}

              {/* Header */}
              <div className="mb-5">
                <div className={[
                  'inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3',
                  isPro ? 'bg-gradient-to-br from-primary to-accent text-white' : 'bg-muted text-muted-foreground',
                ].join(' ')}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-lg font-bold text-foreground">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.priceNote}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                    Current plan
                  </Button>
                ) : isFree ? (
                  <Button variant="outline" className="w-full" onClick={handlePortal} disabled={loading === 'portal'}>
                    {loading === 'portal' ? 'Opening…' : 'Downgrade to Free'}
                  </Button>
                ) : (
                  <Button
                    className={[
                      'w-full font-semibold transition-all duration-150',
                      isPro
                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.01]'
                        : '',
                    ].join(' ')}
                    onClick={() => handleUpgrade(plan.id as 'pro' | 'enterprise')}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Redirecting…' : `Get ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState('company');

  React.useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
    if (searchParams.get('success') === '1') {
      toast.success('Subscription updated successfully!');
    }
  }, [searchParams]);

  const allItems = SETTINGS_NAV.flatMap((s) => s.items);
  const activeItem = allItems.find((i) => i.id === tab) ?? allItems[0];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your workspace, team and subscription.</p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-8 min-h-[600px]">

        {/* Secondary nav rail */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-5">
            {SETTINGS_NAV.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={[
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all text-left',
                        tab === id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-surface/60 hover:text-foreground',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Vertical divider */}
        <div className="w-px shrink-0 bg-border" />

        {/* Content pane */}
        <div className="min-w-0 flex-1">
          {/* Section header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <activeItem.icon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{activeItem.label}</h2>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{activeItem.description}</p>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'company' && (
              <motion.div key="company" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <CompanyProfileTab />
              </motion.div>
            )}
            {tab === 'tax' && (
              <motion.div key="tax" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <TaxRulesTab />
              </motion.div>
            )}
            {tab === 'team' && (
              <motion.div key="team" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <TeamTab />
              </motion.div>
            )}
            {tab === 'billing' && (
              <motion.div key="billing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <BillingTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
