import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const auditIpc = {
  getMetrics: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_METRICS, {}),

  getEvents: (limit: number) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_EVENTS, { limit }),

  getAlerts: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_ALERTS, {}),

  acknowledgeAlert: (alertId: string) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.ACKNOWLEDGE_SECURITY_ALERT, { alert_id: alertId }),
};
