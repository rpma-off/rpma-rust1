import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { JsonValue } from '@/types/json';

/**
 * System health and diagnostic operations
 */
export const systemOperations = {
  getHealthStatus: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.HEALTH_CHECK),

  getApplicationMetrics: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_PERFORMANCE_STATS),

  getDatabaseStatus: (sessionToken: string) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.DIAGNOSE_DATABASE, { session_token: sessionToken }),

  getDatabaseStats: (sessionToken: string) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_STATS, { session_token: sessionToken }),

  getDatabasePoolHealth: (sessionToken: string) =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_POOL_HEALTH, { session_token: sessionToken }),

  getAppInfo: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APP_INFO),

  getDeviceInfo: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DEVICE_INFO),
};
