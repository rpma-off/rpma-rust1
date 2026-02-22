import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const securityIpc = {
  getMetrics: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_METRICS, {
      session_token: sessionToken
    }),

  getEvents: (limit: number, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_EVENTS, {
      limit,
      session_token: sessionToken
    }),

  getAlerts: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_ALERTS, {
      session_token: sessionToken
    }),

  acknowledgeAlert: (alertId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.ACKNOWLEDGE_SECURITY_ALERT, {
      alert_id: alertId,
      session_token: sessionToken
    }),

  resolveAlert: (alertId: string, actionsTaken: string[], sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.RESOLVE_SECURITY_ALERT, {
      alert_id: alertId,
      actions_taken: actionsTaken,
      session_token: sessionToken
    }),

  cleanupEvents: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLEANUP_SECURITY_EVENTS, {
      session_token: sessionToken
    }),

  getActiveSessions: (sessionToken: string): Promise<JsonValue[]> =>
    safeInvoke<JsonValue[]>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {
      session_token: sessionToken
    }),

  revokeSession: (sessionId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.REVOKE_SESSION, {
      session_id: sessionId,
      session_token: sessionToken
    }),

  revokeAllSessionsExceptCurrent: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, {
      session_token: sessionToken
    }),

  updateSessionTimeout: (timeoutMinutes: number, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeout_minutes: timeoutMinutes,
      session_token: sessionToken
    }),

  getSessionTimeoutConfig: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {
      session_token: sessionToken
    }),

  blockIpAddress: (ipAddress: string, reason: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.BLOCK_IP_ADDRESS, {
      ip_address: ipAddress,
      reason,
      session_token: sessionToken
    }),

  unblockIpAddress: (ipAddress: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.UNBLOCK_IP_ADDRESS, {
      ip_address: ipAddress,
      session_token: sessionToken
    }),

  getBlockedIps: (sessionToken: string): Promise<JsonValue[]> =>
    safeInvoke<JsonValue[]>(IPC_COMMANDS.GET_BLOCKED_IPS, {
      session_token: sessionToken
    }),
};
