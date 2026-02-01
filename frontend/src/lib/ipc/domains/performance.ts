import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';

/**
 * Performance monitoring and cache management operations
 */
export const performanceOperations = {
  /**
   * Gets performance statistics
   * @param sessionToken - User's session token
   * @returns Promise resolving to performance statistics
   */
  getStats: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_PERFORMANCE_STATS, {
      session_token: sessionToken
    }),

  /**
   * Gets performance metrics
   * @param limit - Maximum number of metrics to return
   * @param sessionToken - User's session token
   * @returns Promise resolving to performance metrics
   */
  getMetrics: (limit: number, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_PERFORMANCE_METRICS, {
      limit,
      session_token: sessionToken
    }),

  /**
   * Cleans up old performance metrics
   * @param sessionToken - User's session token
   * @returns Promise resolving when cleanup is complete
   */
  cleanupMetrics: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.CLEANUP_PERFORMANCE_METRICS, {
      session_token: sessionToken
    }),

  // Cache management operations
  /**
   * Gets cache statistics
   * @param sessionToken - User's session token
   * @returns Promise resolving to cache statistics
   */
  getCacheStatistics: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_CACHE_STATISTICS, {
      session_token: sessionToken
    }),

  /**
   * Clears application cache
   * @param request - Cache clearing options
   * @param sessionToken - User's session token
   * @returns Promise resolving when cache is cleared
   */
  clearApplicationCache: (
    request: { cache_types?: string[] },
    sessionToken: string
  ): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.CLEAR_APPLICATION_CACHE, {
      request,
      session_token: sessionToken
    }),

  /**
   * Configures cache settings
   * @param request - Cache configuration options
   * @param sessionToken - User's session token
   * @returns Promise resolving when settings are configured
   */
  configureCacheSettings: (
    request: { max_memory_mb?: number; default_ttl_seconds?: number; enable_disk_cache?: boolean },
    sessionToken: string
  ): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.CONFIGURE_CACHE_SETTINGS, {
      request,
      session_token: sessionToken
    }),
};