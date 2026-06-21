'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Building2, Percent, Plus, Trash2, Edit2, Check, X,
  Globe, Phone, MapPin, Receipt, Upload, Image as ImageIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { taxRulesApi, bpsToPercent, percentToBps, type TaxRule } from '@/lib/api/tax-rules';
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

const TABS = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'tax', label: 'Tax Rules', icon: Percent },
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = React.useState('company');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your company profile and workspace configuration.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface/30 p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'company' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <CompanyProfileTab />
        </motion.div>
      )}

      {tab === 'tax' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <TaxRulesTab />
        </motion.div>
      )}
    </div>
  );
}
