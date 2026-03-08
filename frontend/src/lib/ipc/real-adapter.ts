/**
 * Real IPC Adapter Implementation
 *
 * Concrete implementation using Tauri's invoke and safeInvoke
 */

import { safeInvoke, NOT_IMPLEMENTED_COMMANDS, PUBLIC_COMMANDS } from './utils';
import type { IpcAdapter, IpcInvokeOptions } from './adapter';
import type { JsonObject } from '@/types/json';

/**
 * Real adapter implementation for production use
 */
export class TauriAdapter implements IpcAdapter {
  /**
   * Invoke an IPC command using safeInvoke wrapper
   */
  async invoke<T = unknown>(
    command: string,
    args?: JsonObject,
    options?: IpcInvokeOptions
  ): Promise<T> {
    const argsWithCorrelation: JsonObject = {
      ...(args ?? {}),
      correlation_id: options?.correlationId,
    };

    return safeInvoke<T>(
      command,
      argsWithCorrelation,
      options?.validator as (data: unknown) => T,
      options?.timeoutMs
    );
  }

  /**
   * Check if command is implemented (not in NOT_IMPLEMENTED_COMMANDS)
   */
  isImplemented(command: string): boolean {
    return !NOT_IMPLEMENTED_COMMANDS.has(command);
  }

  /**
   * Check if command requires auth (not in PUBLIC_COMMANDS)
   */
  requiresAuth(command: string): boolean {
    return !PUBLIC_COMMANDS.has(command);
  }
}

/**
 * Singleton instance of the real adapter
 */
export const tauriAdapter = new TauriAdapter();
