import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { recordMetric } from './metrics';
import { logger } from '../logging';
import { performanceMonitor } from '../services/performance-monitor';
import { LogDomain, CorrelationContext } from '../logging/types';
import type { ApiError } from '../backend';

/**
 * Maps backend error codes to user-friendly messages
 */
function getUserFriendlyErrorMessage(errorCode: string, originalMessage: string): string {
  switch (errorCode) {
    case 'VALIDATION':
      return 'Les données saisies ne sont pas valides. Veuillez vérifier et réessayer.';
    case 'AUTHENTICATION':
      return 'Erreur d\'authentification. Veuillez vous reconnecter.';
    case 'AUTHORIZATION':
      return 'Vous n\'avez pas les permissions nécessaires pour cette action.';
    case 'NOT_FOUND':
      return 'L\'élément demandé n\'a pas été trouvé.';
    case 'DATABASE':
      return 'Erreur de base de données. Veuillez réessayer plus tard.';
    case 'INTERNAL':
      return 'Erreur interne du serveur. Veuillez contacter le support si le problème persiste.';
    case 'NETWORK':
      return 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
    case 'RATE_LIMIT':
      return 'Trop de requêtes. Veuillez patienter avant de réessayer.';
    default:
      // Return original message if it's already user-friendly, otherwise generic message
      if (originalMessage.length < 100 && !originalMessage.includes('failed') && !originalMessage.includes('error')) {
        return originalMessage;
      }
      return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
  }
}

/**
 * Safe invoke wrapper for Tauri IPC calls
 * Provides centralized logging, error handling, type validation, and metrics recording
 */
interface LocalApiError {
  message: string;
  code: string;
  details?: unknown;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: LocalApiError;
}

interface BackendResponse<T = unknown> {
  type: string;
  payload?: T;
  error?: LocalApiError;
}

interface EnhancedError extends Error {
  code?: string;
  originalMessage?: string;
  details?: unknown;
}

export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
  validator?: (data: unknown) => T,
  timeoutMs: number = 120000 // Increased to 120 seconds to handle database locking
): Promise<T> {
  const startTime = performance.now();

  // Generate or use existing correlation ID
  const correlationId = CorrelationContext.getCurrentId() || CorrelationContext.generateNew();

  // Ensure correlation ID is in the args
  const argsWithCorrelation = {
    ...args,
    correlation_id: correlationId,
  };

  try {
    // Log IPC call start
    logger.debug(LogDomain.API, `IPC call started: ${command}`, {
      command,
      args: sanitizeArgs(args),
      timeout_ms: timeoutMs,
    });

    // Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        logger.warn(LogDomain.API, `IPC call timeout: ${command}`, {
          command,
          timeout_ms: timeoutMs,
        });
        reject(new Error(`IPC call to ${command} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const result = await Promise.race([
      tauriInvoke(command, argsWithCorrelation),
      timeoutPromise
    ]) as ApiResponse<T> | BackendResponse<T> | T;

    const duration = performance.now() - startTime;

    let data: T;

    // Handle backend error responses
    if (result && typeof result === 'object' && 'success' in result) {
      const apiResult = result as ApiResponse<T>;
      if (!apiResult.success) {
        const errorMsg = apiResult.error?.message || 'Unknown error';
        const errorCode = apiResult.error?.code || 'UNKNOWN';

        logger.error(LogDomain.API, `IPC call failed: ${command}`, {
          command,
          error: errorMsg,
          error_code: errorCode,
          duration_ms: Math.round(duration),
        });

        // Create a structured error with user-friendly message
        const userFriendlyMessage = getUserFriendlyErrorMessage(errorCode, errorMsg);
        const error: EnhancedError = new Error(userFriendlyMessage);
        error.code = errorCode;
        error.originalMessage = errorMsg;
        error.details = apiResult.error?.details;
        throw error;
      }

      // Success with wrapper
      data = validator ? validator(apiResult.data) : apiResult.data as T;
    } else if (result && typeof result === 'object' && 'type' in result) {
      // Handle backend response format
      const backendResult = result as BackendResponse<T>;
      if (backendResult.error) {
        const errorMsg = backendResult.error.message;
        const errorCode = backendResult.error.code;

        logger.error(LogDomain.API, `IPC call failed: ${command}`, {
          command,
          error: errorMsg,
          error_code: errorCode,
          duration_ms: Math.round(duration),
        });

        // Create a structured error with user-friendly message
        const userFriendlyMessage = getUserFriendlyErrorMessage(errorCode, errorMsg);
        const error: EnhancedError = new Error(userFriendlyMessage);
        error.code = errorCode;
        error.originalMessage = errorMsg;
        error.details = backendResult.error.details;
        throw error;
      }
      data = validator ? validator(backendResult.payload) : backendResult.payload as T;
    } else {
      // Direct result (array or object)
      data = validator ? validator(result) : result as T;
    }

    // Log successful response
    logger.info(LogDomain.API, `IPC call completed: ${command}`, {
      command,
      duration_ms: Math.round(duration),
      response_type: Array.isArray(data) ? `Array(${data.length})` : typeof data,
    });

    // Record metric
    recordMetric({
      command,
      duration,
      success: true,
      timestamp: Date.now(),
    });

    // Record in performance monitor
    performanceMonitor.recordMetric({
      command,
      duration,
      success: true,
      timestamp: Date.now(),
    });

    return data;

  } catch (error) {
    const duration = performance.now() - startTime;

    // Properly serialize error for logging
    let errorMessage: string;
    let errorDetails: unknown = error;

    if (error instanceof Error) {
      const enhancedError = error as EnhancedError;
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        stack: error.stack,
        code: enhancedError.code,
        details: enhancedError.details
      };
    } else if (typeof error === 'object' && error !== null) {
      // Handle backend ApiError format
      if ('error' in error) {
        errorMessage = String((error as any).error);
        errorDetails = error;
      } else {
        errorMessage = JSON.stringify(error);
        errorDetails = error;
      }
    } else {
      errorMessage = String(error);
    }

    logger.error(LogDomain.API, `IPC call error: ${command}`, error instanceof Error ? error : new Error(errorMessage), {
      command,
      duration_ms: Math.round(duration),
      error_details: errorDetails,
    });

    // Record metric
    recordMetric({
      command,
      duration,
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
    });

    // Record in performance monitor
    performanceMonitor.recordMetric({
      command,
      duration,
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
    });

    throw error;
  }
}

// Helper function to sanitize arguments for logging
function sanitizeArgs(args?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!args) return undefined;

  const sensitiveFields = new Set([
    'password',
    'token',
    'refresh_token',
    'session_token',
    'secret',
    'key',
    'auth',
    'authorization',
  ]);

  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return value.length > 100 ? `${value.substring(0, 100)}...[truncated]` : value;
    }
    if (Array.isArray(value)) {
      if (value.length > 10) {
        return `[Array(${value.length})]`;
      }
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 10) {
        return `[Object(${entries.length} keys)]`;
      }
      const sanitizedObject: Record<string, unknown> = {};
      for (const [key, entryValue] of entries) {
        if (sensitiveFields.has(key.toLowerCase())) {
          sanitizedObject[key] = '[REDACTED]';
        } else {
          sanitizedObject[key] = sanitizeValue(entryValue);
        }
      }
      return sanitizedObject;
    }
    return value;
  };

  return sanitizeValue(args) as Record<string, unknown>;
}
