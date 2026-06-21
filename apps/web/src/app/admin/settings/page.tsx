'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings, Shield, Megaphone, Plus } from 'lucide-react';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
import { adminApi } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function SectionCard({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [banner, setBanner] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const { data: superAdmins, isLoading } = useQuery({
    queryKey: ['admin', 'admins'],
    queryFn: adminApi.getSuperAdmins,
    staleTime: 60_000,
  });

  const handleSaveBanner = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600)); // stub
    setSaving(false);
    toast.success('Announcement banner saved');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Platform configuration and admin management</p>
      </div>

      {/* Platform Info */}
      <SectionCard title="Platform Info" subtitle="Read-only platform details" icon={Settings}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'Platform Name', value: 'Sterling' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Deployed URL', value: 'https://sterling.shafinzaman.dev' },
            { label: 'API URL', value: 'https://sterling.shafinzaman.dev/api/v1' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border/50 bg-surface/50 px-4 py-3">
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      {/* Super Admin Accounts */}
      <SectionCard title="Super Admin Accounts" subtitle="Users with platform-level access" icon={Shield}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {superAdmins ? `${superAdmins.length} super admin${superAdmins.length !== 1 ? 's' : ''}` : ''}
          </p>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            <Plus className="h-4 w-4 mr-1.5" /> Add Super Admin
          </Button>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
          ) : superAdmins?.length ? (
            superAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center gap-3 py-3">
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary',
                )}>
                  {admin.firstName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {admin.firstName} {admin.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {fmtDate(admin.createdAt)}
                </span>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No super admins found</p>
          )}
        </div>
      </SectionCard>

      {/* Announcement Banner */}
      <SectionCard title="Announcement Banner" subtitle="Display a notice to all logged-in users" icon={Megaphone}>
        <div className="space-y-4">
          <textarea
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
            rows={3}
            placeholder="e.g. We will be performing maintenance on Sunday at 2:00 AM UTC..."
            className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Leave blank to hide the banner. Saved banners appear at the top of the app.
            </p>
            <Button size="sm" onClick={handleSaveBanner} loading={saving}>
              Save Banner
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
