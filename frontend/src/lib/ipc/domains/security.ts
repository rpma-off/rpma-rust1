import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { JsonValue } from '@/types/json';

/**
 * Security session management operations
 */
export const securityOperations = {
  getActiveSessions: (sessionToken: string) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, { sessionToken }),

  revokeSession: (sessionId: string, sessionToken: string) =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_SESSION, { sessionId, sessionToken }),

  revokeAllSessionsExceptCurrent: (sessionToken: string) =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, { sessionToken }),

  updateSessionTimeout: (timeoutMinutes: number, sessionToken: string) =>
    safeInvoke<void>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, { timeoutMinutes, sessionToken }),

  getSessionTimeoutConfig: (sessionToken: string) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, { sessionToken }),
};
