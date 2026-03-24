import type { JsonValue } from "@/types/json";
import type { GlobalSearchResponse } from "@/lib/backend";
import { safeInvoke } from "../core";
import { IPC_COMMANDS } from "../commands";

/**
 * System health, diagnostic, and global search operations.
 * All calls go through safeInvoke which auto-injects the session token,
 * correlation ID, timeout, and error normalisation.
 */
export const systemOperations = {
  getHealthStatus: () => safeInvoke<JsonValue>(IPC_COMMANDS.HEALTH_CHECK),

  getDatabaseStatus: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.DIAGNOSE_DATABASE, {}),

  getDatabaseStats: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_STATS, {}),

  getDatabasePoolHealth: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_DATABASE_POOL_HEALTH, {}),

  getAppInfo: () => safeInvoke<JsonValue>(IPC_COMMANDS.GET_APP_INFO),

  getDeviceInfo: () => safeInvoke<JsonValue>(IPC_COMMANDS.GET_DEVICE_INFO),

  /**
   * Full-text search across tasks, clients, materials and quotes.
   * Replaces direct `invoke('global_search', …)` calls in UI components —
   * routes through safeInvoke so the session token is injected automatically
   * and errors are normalised to the standard IpcError shape.
   */
  globalSearch: (query: string) =>
    safeInvoke<GlobalSearchResponse>(IPC_COMMANDS.GLOBAL_SEARCH, { query }),
};
