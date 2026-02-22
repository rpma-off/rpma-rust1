import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const performanceIpc = {
  getStats: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_PERFORMANCE_STATS, {
      session_token: sessionToken
    }),

  getMetrics: (limit: number, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_PERFORMANCE_METRICS, {
      limit,
      session_token: sessionToken
    }),

  cleanupMetrics: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLEANUP_PERFORMANCE_METRICS, {
      session_token: sessionToken
    }),

  getCacheStatistics: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_CACHE_STATISTICS, {
      session_token: sessionToken
    }),

  clearApplicationCache: (
    request: { cache_types?: string[] },
    sessionToken: string
  ): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLEAR_APPLICATION_CACHE, {
      request,
      session_token: sessionToken
    }),

  configureCacheSettings: (
    request: { max_memory_mb?: number; default_ttl_seconds?: number; enable_disk_cache?: boolean },
    sessionToken: string
  ): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CONFIGURE_CACHE_SETTINGS, {
      request,
      session_token: sessionToken
    }),
};
