/**
 * IPC Adapter Interface
 *
 * Defines the contract for IPC communication between frontend and backend.
 * All IPC calls should go through this adapter to ensure:
 * - Centralized error handling
 * - Consistent logging
 * - Easy mocking for tests
 * - Type safety
 */

import type { JsonObject, JsonValue } from '@/types/json';

/**
 * Options for IPC invocations
 */
export interface IpcInvokeOptions {
  /** Correlation ID for end-to-end tracing */
  correlationId?: string;
  /** Request timeout in milliseconds (default: 120s) */
  timeoutMs?: number;
  /** Validator function to type-check response data */
  validator?: (data: JsonValue) => unknown;
}

/**
 * Interface that all IPC adapters must implement
 */
export interface IpcAdapter {
  /**
   * Invoke an IPC command with type safety
   * @param command - IPC command name (e.g., 'auth_login', 'task_create')
   * @param args - Command arguments
   * @param options - Invocation options
   * @returns Promise resolving to typed response data
   * @throws EnhancedError with correlationId, code, and user-friendly message
   */
  invoke<T = JsonValue>(
    command: string,
    args?: JsonObject,
    options?: IpcInvokeOptions
  ): Promise<T>;

  /**
   * Check if an IPC command is implemented in the backend
   * @param command - IPC command name
   * @returns true if implemented, false otherwise
   */
  isImplemented(command: string): boolean;

  /**
   * Check if an IPC command requires authentication
   * @param command - IPC command name
   * @returns true if requires auth, false if public
   */
  requiresAuth(command: string): boolean;
}

/**
 * Enhanced error type thrown by IPC adapter
 */
export interface IpcError extends Error {
  /** Error code from backend */
  code?: string;
  /** Original error message */
  originalMessage?: string;
  /** Additional error details */
  details?: Record<string, unknown> | null;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Whether error was already logged */
  alreadyLogged?: boolean;
}

/**
 * Create an IPC error from raw error
 */
export function createIpcError(
  message: string,
  code?: string,
  correlationId?: string,
  originalMessage?: string
): IpcError {
  const error = new Error(message) as IpcError;
  error.code = code;
  error.correlationId = correlationId;
  error.originalMessage = originalMessage;
  error.alreadyLogged = false;
  return error;
}

/**
 * Check if an error is an IPC error
 */
export function isIpcError(error: unknown): error is IpcError {
  return error instanceof Error && 'correlationId' in error;
}
