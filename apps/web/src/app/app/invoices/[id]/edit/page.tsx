'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api/invoices';
import { InvoiceEditor } from '@/components/invoices/invoice-editor';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!invoice) return null;
  return <InvoiceEditor invoice={invoice} />;
}
