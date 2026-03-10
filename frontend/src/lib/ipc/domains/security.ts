import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { JsonValue } from '@/types/json';

/**
 * Security session management operations
 */
export const securityOperations = {
  getActiveSessions: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {}),

  revokeSession: (sessionId: string) =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_SESSION, { sessionId }),

  revokeAllSessionsExceptCurrent: () =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, {}),

  updateSessionTimeout: (timeoutMinutes: number) =>
    safeInvoke<void>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, { timeoutMinutes }),

  getSessionTimeoutConfig: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {}),
};
