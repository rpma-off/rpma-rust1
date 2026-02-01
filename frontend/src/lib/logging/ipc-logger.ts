// frontend/src/lib/logging/ipc-logger.ts
// IPC-specific logging wrapper

import { LogDomain, CorrelationContext } from './types';
import { logger } from './logger';

export interface IPCLogContext {
  command: string;
  args?: Record<string, unknown>;
  response?: unknown;
  duration_ms?: number;
  success: boolean;
  error?: string;
}

export class IPCLogger {
  static logCall(context: Omit<IPCLogContext, 'response' | 'duration_ms' | 'success'>): () => void {
    const startTime = performance.now();
    const correlationId = CorrelationContext.getCurrentId();

    logger.debug(LogDomain.API, `IPC call started: ${context.command}`, {
      command: context.command,
      args: this.sanitizeArgs(context.args),
      correlation_id: correlationId
    });

    return () => {
      const duration = performance.now() - startTime;
      logger.debug(LogDomain.API, `IPC call completed: ${context.command}`, {
        command: context.command,
        duration_ms: Math.round(duration),
        correlation_id: correlationId
      });
    };
  }

  static logResponse(context: IPCLogContext): void {
    const correlationId = CorrelationContext.getCurrentId();

    if (context.success) {
      logger.info(LogDomain.API, `IPC response success: ${context.command}`, {
        command: context.command,
        duration_ms: context.duration_ms,
        response_size: this.getResponseSize(context.response),
        correlation_id: correlationId
      });
    } else {
      logger.error(LogDomain.API, `IPC response error: ${context.command}`, {
        command: context.command,
        duration_ms: context.duration_ms,
        error: context.error,
        correlation_id: correlationId
      });
    }
  }

  static logTimeout(command: string, timeoutMs: number): void {
    const correlationId = CorrelationContext.getCurrentId();

    logger.error(LogDomain.API, `IPC call timeout: ${command}`, {
      command,
      timeout_ms: timeoutMs,
      correlation_id: correlationId
    });
  }

  static logRetry(command: string, attempt: number, maxRetries: number, error: string): void {
    const correlationId = CorrelationContext.getCurrentId();

    logger.warn(LogDomain.API, `IPC retry: ${command}`, {
      command,
      attempt,
      max_retries: maxRetries,
      error,
      correlation_id: correlationId
    });
  }

  private static sanitizeArgs(args?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!args) return undefined;

    const sanitized = { ...args };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate large values
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else if (Array.isArray(value) && value.length > 10) {
        sanitized[key] = `[Array(${value.length})]`;
      } else if (value && typeof value === 'object' && Object.keys(value).length > 10) {
        sanitized[key] = `[Object(${Object.keys(value).length} keys)]`;
      }
    }

    return sanitized;
  }

  private static getResponseSize(response?: unknown): number {
    if (!response) return 0;

    try {
      return JSON.stringify(response).length;
    } catch {
      return 0;
    }
  }
}