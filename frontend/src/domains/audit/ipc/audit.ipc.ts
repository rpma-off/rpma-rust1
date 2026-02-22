import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const auditIpc = {
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
};
