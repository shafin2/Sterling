import { Metadata } from 'next';
import { use } from 'react';
import { PublicInvoiceView } from './public-invoice-view';

export const metadata: Metadata = {
  title: 'Invoice — Sterling',
  description: 'View your invoice',
};

export default function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <PublicInvoiceView token={token} />;
}
