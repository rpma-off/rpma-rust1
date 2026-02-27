import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const adminIpc = {
  healthCheck: (): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.HEALTH_CHECK),

  getHealthStatus: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.HEALTH_CHECK),

  getApplicationMetrics: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_PERFORMANCE_STATS),

  getDatabaseStatus: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.DIAGNOSE_DATABASE, { session_token: sessionToken }),

  getDatabaseStats: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_STATS, { session_token: sessionToken }),

  getDatabasePoolHealth: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_POOL_HEALTH, { session_token: sessionToken }),

  getAppInfo: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APP_INFO),

  getDeviceInfo: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DEVICE_INFO),
};
