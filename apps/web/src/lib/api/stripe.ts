import { api } from '../api';

export type StripePlan = 'free' | 'pro' | 'enterprise';

export interface SubscriptionStatus {
  plan: StripePlan;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const stripeApi = {
  getStatus(): Promise<SubscriptionStatus> {
    return api.get('stripe/status').json<SubscriptionStatus>();
  },

  createCheckoutSession(plan: 'pro' | 'enterprise'): Promise<{ url: string }> {
    return api.post('stripe/checkout', { json: { plan } }).json<{ url: string }>();
  },

  createPortalSession(): Promise<{ url: string }> {
    return api.post('stripe/portal').json<{ url: string }>();
  },
};
