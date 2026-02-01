import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';

/**
 * System operations and diagnostics
 */
export const systemOperations = {
  /**
   * Performs a health check on the system
   * @returns Promise resolving to health check result
   */
  healthCheck: (): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.HEALTH_CHECK),

  /**
   * Gets detailed health status information
   * @returns Promise resolving to health status
   */
  getHealthStatus: (): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_HEALTH_STATUS),

  /**
   * Gets application performance metrics
   * @returns Promise resolving to application metrics
   */
  getApplicationMetrics: (): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_APPLICATION_METRICS),

  /**
   * Diagnoses database status and health
   * @returns Promise resolving to database status
   */
  getDatabaseStatus: (): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.DIAGNOSE_DATABASE),

  /**
   * Gets database statistics
   * @returns Promise resolving to database stats
   */
  getDatabaseStats: (): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_DATABASE_STATS),

  /**
   * Gets database connection pool health
   * @returns Promise resolving to pool health information
   */
  getDatabasePoolHealth: (): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_DATABASE_POOL_HEALTH),

  /**
   * Gets application information
   * @returns Promise resolving to app info
   */
  getAppInfo: (): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_APP_INFO),

  /**
   * Gets device information
   * @returns Promise resolving to device info
   */
  getDeviceInfo: (): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_DEVICE_INFO),
};