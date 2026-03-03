import {
  getSessionToken as getAuthSessionToken,
  requireSessionToken as requireAuthSessionToken,
} from '@/domains/auth/services/sessionToken';

export async function getSessionToken(): Promise<string | null> {
  return getAuthSessionToken();
}

export async function requireSessionToken(): Promise<string> {
  return requireAuthSessionToken();
}
