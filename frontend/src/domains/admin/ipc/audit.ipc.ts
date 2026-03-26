import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';
import type { AuditActivityFilter, PaginatedUserActivity } from '@/lib/backend';

export const auditIpc = {
  getMetrics: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_METRICS, {}),

  getEvents: (limit: number) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_EVENTS, { limit }),

  getAlerts: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_ALERTS, {}),

  acknowledgeAlert: (alertId: string) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.ACKNOWLEDGE_SECURITY_ALERT, { alert_id: alertId }),

  getAllUserActivity: (filter?: AuditActivityFilter) =>
    safeInvoke<PaginatedUserActivity>(IPC_COMMANDS.GET_ALL_USER_ACTIVITY, filter ? { filter } : {}),

  getAuditEventTypes: () =>
    safeInvoke<string[]>(IPC_COMMANDS.GET_AUDIT_EVENT_TYPES, {}),
};
