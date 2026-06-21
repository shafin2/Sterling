import { api } from './api';

export interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalInvoices: number;
  newTenantsThisMonth: number;
  newTenantsLastMonth: number;
}

export interface WeeklySignup {
  week: string;
  count: number;
}

export interface PlanBreakdown {
  free: number;
  pro: number;
  business: number;
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: string;
  isActive: boolean;
  suspendedAt: string | null;
  invoiceCount: number;
  memberCount: number;
  lastActiveAt: string | null;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
}

export interface TenantMember {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

export interface TenantActivity {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  createdAt: string;
}

export interface SuperAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export const adminApi = {
  getStats: () => api.get('admin/stats').json<AdminStats>(),

  getSignups: (weeks = 8) =>
    api.get(`admin/signups?weeks=${weeks}`).json<WeeklySignup[]>(),

  getPlans: () => api.get('admin/plans').json<PlanBreakdown>(),

  getTenants: (params: { page?: number; limit?: number; search?: string } = {}) => {
    const { page = 1, limit = 20, search } = params;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) qs.set('search', search);
    return api.get(`admin/tenants?${qs.toString()}`).json<{
      data: AdminTenant[];
      total: number;
      page: number;
      limit: number;
    }>();
  },

  getTenantDetail: (id: string) =>
    api.get(`admin/tenants/${id}`).json<AdminTenant & {
      ownerFirstName: string | null;
      ownerLastName: string | null;
      invoiceCountLive: number;
      members: TenantMember[];
    }>(),

  getTenantMembers: (id: string) =>
    api.get(`admin/tenants/${id}/members`).json<TenantMember[]>(),

  getTenantActivity: (id: string, limit = 50) =>
    api.get(`admin/tenants/${id}/activity?limit=${limit}`).json<TenantActivity[]>(),

  suspendTenant: (id: string) =>
    api.patch(`admin/tenants/${id}/suspend`).json<AdminTenant>(),

  activateTenant: (id: string) =>
    api.patch(`admin/tenants/${id}/activate`).json<AdminTenant>(),

  updateTenantPlan: (id: string, plan: 'free' | 'pro' | 'business') =>
    api.patch(`admin/tenants/${id}/plan`, { json: { plan } }).json<AdminTenant>(),

  getSuperAdmins: () => api.get('admin/admins').json<SuperAdmin[]>(),
};
