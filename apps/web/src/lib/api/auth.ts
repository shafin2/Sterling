import { api } from '../api';

export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  isEmailVerified: boolean;
  role: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
}

export async function getMe(): Promise<MeResponse> {
  return api.get('auth/me').json<MeResponse>();
}

export async function logout(): Promise<void> {
  await api.post('auth/logout');
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post('auth/verify-email', { json: { token } });
}

export async function resendVerification(email: string): Promise<void> {
  await api.post('auth/resend-verification', { json: { email } });
}
