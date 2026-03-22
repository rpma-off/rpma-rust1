import type { JsonValue } from '@/types/json';
import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';

/**
 * System health and diagnostic operations
 */
export const systemOperations = {
  getHealthStatus: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.HEALTH_CHECK),

  getDatabaseStatus: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.DIAGNOSE_DATABASE, {}),

  getDatabaseStats: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_STATS, {}),

  getDatabasePoolHealth: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_POOL_HEALTH, {}),

  getAppInfo: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APP_INFO),

  getDeviceInfo: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DEVICE_INFO),
};
