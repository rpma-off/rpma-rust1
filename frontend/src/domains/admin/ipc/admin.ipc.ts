import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const adminIpc = {
  healthCheck: () =>
    safeInvoke<string>(IPC_COMMANDS.HEALTH_CHECK),

  getHealthStatus: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.HEALTH_CHECK),

  getDatabaseStats: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_STATS, {}),
};
