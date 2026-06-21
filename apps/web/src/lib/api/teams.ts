import { api } from '../api';

export type Role = 'owner' | 'admin' | 'accountant' | 'hr' | 'viewer';

export interface TeamMember {
  userId: string;
  role: Role;
  joinedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  lastLoginAt: string | null;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
}

export interface InviteInfo {
  email: string;
  tenantName: string;
  role: Role;
  expired: boolean;
  accepted: boolean;
}

export const teamsApi = {
  getMembers: () => api.get('teams/members').json<TeamMember[]>(),
  getPendingInvites: () => api.get('teams/invites').json<PendingInvite[]>(),
  createInvite: (dto: { email: string; role: Role }) =>
    api.post('teams/invite', { json: dto }).json<{ id: string; email: string; role: Role }>(),
  resendInvite: (id: string) =>
    api.post(`teams/invites/${id}/resend`).json<{ id: string; expiresAt: string }>(),
  cancelInvite: (id: string) => api.delete(`teams/invites/${id}`),
  updateMemberRole: (userId: string, role: Role) =>
    api
      .patch(`teams/members/${userId}/role`, { json: { role } })
      .json<{ userId: string; role: Role }>(),
  removeMember: (userId: string) => api.delete(`teams/members/${userId}`),
  getInviteInfo: (token: string) =>
    api.get(`teams/invite-info?token=${token}`).json<InviteInfo>(),
  acceptInvite: (dto: {
    token: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }) =>
    api
      .post('teams/accept', { json: dto })
      .json<{ userId: string; tenantId: string; role: Role }>(),
};
