import { safeInvoke } from '@/lib/ipc/core';
import type { JsonValue } from '@/types/json';

export const auditIpc = {
  getMetrics: () =>
    safeInvoke<JsonValue>('get_security_metrics', {}),

  getEvents: (limit: number) =>
    safeInvoke<JsonValue>('get_security_events', { limit }),

  getAlerts: () =>
    safeInvoke<JsonValue>('get_security_alerts', {}),

  acknowledgeAlert: (alertId: string) =>
    safeInvoke<JsonValue>('acknowledge_security_alert', { alert_id: alertId }),

  resolveAlert: (alertId: string, actionsTaken: string[]) =>
    safeInvoke<JsonValue>('resolve_security_alert', { alert_id: alertId, actions_taken: actionsTaken }),

  cleanupEvents: () =>
    safeInvoke<JsonValue>('cleanup_security_events', {}),
};
