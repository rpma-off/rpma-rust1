import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { JsonValue } from '@/types/json';

/**
 * System health and diagnostic operations
 */
export const systemOperations = {
  getHealthStatus: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_HEALTH_STATUS),

  getApplicationMetrics: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APPLICATION_METRICS),

  getDatabaseStatus: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.DIAGNOSE_DATABASE),

  getDatabaseStats: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_STATS),

  getDatabasePoolHealth: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_POOL_HEALTH),

  getAppInfo: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APP_INFO),

  getDeviceInfo: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DEVICE_INFO),
};
