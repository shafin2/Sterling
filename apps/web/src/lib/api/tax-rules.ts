import { api } from '@/lib/api';

export interface TaxRule {
  id: string;
  tenantId: string;
  name: string;
  rateBps: number; // e.g. 1500 = 15%
  appliesTo: 'invoice' | 'payroll' | 'both';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRulePayload {
  name: string;
  rateBps: number;
  appliesTo: 'invoice' | 'payroll' | 'both';
  isActive?: boolean;
}

export const taxRulesApi = {
  list: (params?: { appliesTo?: string; isActive?: boolean }) =>
    api.get('tax-rules', { searchParams: params as Record<string, string | boolean | undefined> }).json<TaxRule[]>(),

  get: (id: string) =>
    api.get(`tax-rules/${id}`).json<TaxRule>(),

  create: (payload: CreateTaxRulePayload) =>
    api.post('tax-rules', { json: payload }).json<TaxRule>(),

  update: (id: string, payload: Partial<CreateTaxRulePayload>) =>
    api.patch(`tax-rules/${id}`, { json: payload }).json<TaxRule>(),

  remove: (id: string) =>
    api.delete(`tax-rules/${id}`),
};

/** Convert basis points to display percentage string, e.g. 1500 → "15.00%" */
export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/** Convert percentage string to basis points, e.g. "15" → 1500 */
export function percentToBps(pct: number): number {
  return Math.round(pct * 100);
}
