import { api } from '../api';

export type StripePlan = 'free' | 'pro' | 'enterprise';

export interface SubscriptionStatus {
  plan: StripePlan;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentRecord {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export const stripeApi = {
  getStatus(): Promise<SubscriptionStatus> {
    return api.get('stripe/status').json<SubscriptionStatus>();
  },

  getInvoices(): Promise<PaymentRecord[]> {
    return api.get('stripe/invoices').json<PaymentRecord[]>();
  },

  createCheckoutSession(plan: 'pro' | 'enterprise'): Promise<{ url: string }> {
    return api.post('stripe/checkout', { json: { plan } }).json<{ url: string }>();
  },

  createPortalSession(): Promise<{ url: string }> {
    return api.post('stripe/portal').json<{ url: string }>();
  },
};
