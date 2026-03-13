import { safeInvoke } from '@/lib/ipc/core';
import type { UserSession } from '@/lib/backend/auth';

export interface SessionTimeoutConfig {
  default_timeout_minutes: number;
  max_timeout_minutes: number;
  enforce_timeout: boolean;
}

export const securityIpc = {
  getActiveSessions: () =>
    safeInvoke<UserSession[]>('get_active_sessions', {}),

  revokeSession: (sessionId: string) =>
    safeInvoke<string>('revoke_session', { session_id: sessionId }),

  revokeAllSessionsExceptCurrent: () =>
    safeInvoke<number>('revoke_all_sessions_except_current', {}),

  updateSessionTimeout: (timeoutMinutes: number) =>
    safeInvoke<string>('update_session_timeout', { timeout_minutes: timeoutMinutes }),

  getSessionTimeoutConfig: () =>
    safeInvoke<SessionTimeoutConfig>('get_session_timeout_config', {}),
};
