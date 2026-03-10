import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const performanceIpc = {
  getStats: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_PERFORMANCE_STATS, {}),

  getMetrics: (limit: number): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_PERFORMANCE_METRICS, {
      limit
    }),

  cleanupMetrics: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLEANUP_PERFORMANCE_METRICS, {}),

  getCacheStatistics: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_CACHE_STATISTICS, {}),

  clearApplicationCache: (
    request: { cache_types?: string[] }
  ): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLEAR_APPLICATION_CACHE, {
      request
    }),

  configureCacheSettings: (
    request: { max_memory_mb?: number; default_ttl_seconds?: number; enable_disk_cache?: boolean }
  ): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CONFIGURE_CACHE_SETTINGS, {
      request
    }),
};
