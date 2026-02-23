import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const adminIpc = {
  healthCheck: (): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.HEALTH_CHECK),

  getHealthStatus: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_HEALTH_STATUS),

  getApplicationMetrics: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APPLICATION_METRICS),

  getDatabaseStatus: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.DIAGNOSE_DATABASE, { session_token: sessionToken }),

  getDatabaseStats: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_STATS, { session_token: sessionToken }),

  getDatabasePoolHealth: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_POOL_HEALTH),

  getAppInfo: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APP_INFO),

  getDeviceInfo: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DEVICE_INFO),
};
