// Session token utilities. Canonical implementation lives in lib/auth/session;
// re-exported from here for backward-compatible import paths within the auth domain.
export { getSessionToken, requireSessionToken } from '@/lib/auth/session';
