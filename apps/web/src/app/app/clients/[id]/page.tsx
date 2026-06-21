'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { use } from 'react';
import {
  ArrowLeft, Building2, User, Mail, Phone, Globe, FileText,
  MapPin, Hash, Pencil, Trash2, BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientsApi, type Client } from '@/lib/api/clients';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientDrawer } from '../client-drawer';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = React.useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => clientsApi.delete(id),
    onSuccess: () => {
      toast.success('Client deleted');
      qc.invalidateQueries({ queryKey: ['clients'] });
      router.push('/app/clients');
    },
    onError: () => toast.error('Failed to delete client'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!client) return null;

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
            <Link href="/app/clients">
              <ArrowLeft className="mr-1 h-4 w-4" /> Clients
            </Link>
          </Button>
          <span className="text-muted">/</span>
          <span className="truncate font-semibold text-foreground">{client.name}</span>
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
              if (confirm('Delete this client? This cannot be undone.')) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </motion.div>

      {/* Profile card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-background p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {client.type === 'company' ? (
                  <Building2 className="h-7 w-7" />
                ) : (
                  <User className="h-7 w-7" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
                  <StatusBadge status={client.status} />
                </div>
                <p className="mt-0.5 text-sm capitalize text-muted">{client.type}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={Phone} label="Phone" value={client.phone} />
              <InfoRow icon={Globe} label="Website" value={client.website} link />
              <InfoRow icon={Hash} label="Tax ID / NTN" value={client.taxId} />
              <InfoRow icon={BadgeCheck} label="Currency" value={client.currency} />
            </div>
          </motion.div>

          {/* Billing address */}
          {client.billingAddress && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted" />
                <h3 className="font-semibold text-foreground">Billing Address</h3>
              </div>
              <p className="text-sm text-foreground">{client.billingAddress}</p>
              <p className="text-sm text-muted">
                {[client.billingCity, client.billingState, client.billingPostalCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="text-sm text-muted">{client.billingCountry}</p>
            </motion.div>
          )}

          {/* Notes */}
          {client.notes && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted" />
                <h3 className="font-semibold text-foreground">Notes</h3>
              </div>
              <p className="text-sm text-muted whitespace-pre-wrap">{client.notes}</p>
            </motion.div>
          )}
        </div>

        {/* Sidebar meta */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-background p-6 space-y-4 h-fit"
        >
          <h3 className="font-semibold text-foreground">Details</h3>
          <MetaRow label="Type" value={client.type.charAt(0).toUpperCase() + client.type.slice(1)} />
          <MetaRow label="Currency" value={client.currency} />
          <MetaRow label="Status" value={<StatusBadge status={client.status} />} />
          <MetaRow
            label="Created"
            value={new Date(client.createdAt).toLocaleDateString('en-PK', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          />
        </motion.div>
      </div>

      <ClientDrawer
        open={editOpen}
        client={client}
        onClose={() => {
          setEditOpen(false);
          qc.invalidateQueries({ queryKey: ['client', id] });
        }}
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  link,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  label: string;
  value?: string;
  link?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <div>
        <p className="text-xs text-muted">{label}</p>
        {link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-foreground">{value}</p>
        )}
      </div>
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
