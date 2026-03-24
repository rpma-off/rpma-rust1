/**
 * Real IPC Adapter Implementation
 *
 * Concrete implementation using Tauri's invoke and safeInvoke
 */

import type { JsonObject } from "@/types/json";
import { safeInvoke, PUBLIC_COMMANDS } from "./utils";
import type { IpcAdapter, IpcInvokeOptions } from "./adapter";

/**
 * Real adapter implementation for production use
 */
export class TauriAdapter implements IpcAdapter {
  /**
   * Invoke an IPC command using safeInvoke wrapper
   */
  async invoke<T>(
    _command: string,
    args?: JsonObject,
    options?: IpcInvokeOptions,
  ): Promise<T> {
    const argsWithCorrelation: JsonObject =
      options?.correlationId !== undefined
        ? {
            ...(args ?? {}),
            correlation_id: options.correlationId,
          }
        : { ...(args ?? {}) };

    return safeInvoke<T>(
      _command,
      argsWithCorrelation,
      options?.validator as (data: unknown) => T,
      options?.timeoutMs,
    );
  }

  /**
   * Check if command is implemented (always true now)
   */
  isImplemented(_command: string): boolean {
    return true;
  }

  /**
   * Check if command requires auth (not in PUBLIC_COMMANDS)
   */
  requiresAuth(_command: string): boolean {
    return !PUBLIC_COMMANDS.has(_command);
  }
}

/**
 * Singleton instance of the real adapter
 */
export const tauriAdapter = new TauriAdapter();
