import { safeInvoke } from '@/lib/ipc/core';
import type { JsonValue } from '@/types/json';

export const adminIpc = {
  healthCheck: () =>
    safeInvoke<string>('health_check'),

  getHealthStatus: () =>
    safeInvoke<JsonValue>('health_check'),

  getDatabaseStatus: () =>
    safeInvoke<JsonValue>('diagnose_database', {}),

  getDatabaseStats: () =>
    safeInvoke<JsonValue>('get_database_stats', {}),

  getDatabasePoolHealth: () =>
    safeInvoke<JsonValue>('get_database_pool_health', {}),

  getAppInfo: () =>
    safeInvoke<JsonValue>('get_app_info'),

  getDeviceInfo: () =>
    safeInvoke<JsonValue>('get_device_info'),
};
