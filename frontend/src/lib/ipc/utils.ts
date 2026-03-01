import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { recordMetric } from './metrics';
import { logger } from '../logging';
import { getSessionToken } from '@/domains/auth';
import { LogDomain, CorrelationContext } from '../logging/types';
import type { ApiResponse } from '@/types/api';
import type { JsonObject, JsonValue } from '@/types/json';

/**
 * IPC commands that have no backend handler registered in main.rs.
 * Calling them will produce a Tauri "command not found" error.
 * safeInvoke short-circuits these with a clear, descriptive error.
 */
export const NOT_IMPLEMENTED_COMMANDS = new Set([
  'auth_refresh_token',
  'enable_2fa',
  'verify_2fa_setup',
  'disable_2fa',
  'regenerate_backup_codes',
  'is_2fa_enabled',
]);

/**
 * IPC commands that do not require a session token.
 * All other commands are considered protected and will have the session_token
 * auto-injected into the args before being sent to the backend.
 */
const PUBLIC_COMMANDS = new Set([
  // Auth - no session required (or handled via separate token param)
  'auth_login',
  'auth_create_account',
  'auth_validate_session',
  'auth_refresh_token',
  'auth_logout',
  // Bootstrap - pre-auth setup
  'has_admins',
  'bootstrap_first_admin',
  // UI window controls - no auth needed
  'ui_window_minimize',
  'ui_window_maximize',
  'ui_window_close',
  // Navigation - no auth needed
  'navigation_update',
  'navigation_go_back',
  'navigation_go_forward',
  'navigation_get_current',
  'navigation_add_to_history',
  // Shell / GPS
  'shortcuts_register',
  'ui_shell_open_url',
  'ui_gps_get_current_position',
  'ui_initiate_customer_call',
  // System info / health
  'get_app_info',
]);

const KNOWN_CLIENT_ERRORS = new Set([
  'client introuvable. veuillez sélectionner un client existant.',
  'client not found',
]);

/**
 * Maps backend error codes to user-friendly messages
 */
function getUserFriendlyErrorMessage(errorCode: string, originalMessage: string): string {
  const normalizedMessage = originalMessage.trim().toLowerCase();
  if (
    errorCode === 'VALIDATION_ERROR' &&
    (KNOWN_CLIENT_ERRORS.has(normalizedMessage) || normalizedMessage.startsWith('client introuvable'))
  ) {
    return 'Client introuvable. Sélectionnez un client existant ou créez-en un.';
  }

  switch (errorCode) {
    case 'VALIDATION':
    case 'VALIDATION_ERROR':
      return 'Les données saisies ne sont pas valides. Veuillez vérifier et réessayer.';
    case 'AUTHENTICATION':
    case 'AUTH_INVALID':
      return 'Erreur d\'authentification. Veuillez vous reconnecter.';
    case 'AUTHORIZATION':
    case 'AUTH_FORBIDDEN':
      return 'Vous n\'avez pas les permissions nécessaires pour cette action.';
    case 'NOT_FOUND':
      return 'L\'élément demandé n\'a pas été trouvé.';
    case 'DATABASE':
    case 'DATABASE_ERROR':
      return 'Erreur de base de données. Veuillez réessayer plus tard.';
    case 'INTERNAL':
    case 'INTERNAL_ERROR':
      return 'Erreur interne du serveur. Veuillez contacter le support si le problème persiste.';
    case 'NETWORK':
    case 'NETWORK_ERROR':
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
  details?: JsonValue | null;
}

interface BackendResponse<T = JsonValue> {
  type: string;
  success?: boolean;
  message?: string;
  error_code?: string;
  data?: T;
  payload?: T;
  error?: LocalApiError;
  correlation_id?: string;
}

interface EnhancedError extends Error {
  code?: string;
  originalMessage?: string;
  details?: Record<string, unknown> | null;
  correlationId?: string;
  alreadyLogged?: boolean;
}

export async function safeInvoke<T>(
  command: string,
  args?: JsonObject,
  validator?: (data: JsonValue) => T,
  timeoutMs: number = 120000 // Increased to 120 seconds to handle database locking
): Promise<T> {
  const startTime = performance.now();

  // Guard: reject calls to commands with no backend handler
  if (NOT_IMPLEMENTED_COMMANDS.has(command)) {
    const notImplError: EnhancedError = new Error(
      `La commande « ${command} » n'est pas encore implémentée côté backend.`
    );
    notImplError.code = 'NOT_IMPLEMENTED';
    notImplError.correlationId = typeof args?.correlation_id === 'string' ? args.correlation_id : undefined;
    notImplError.alreadyLogged = false;
    throw notImplError;
  }

  const providedCorrelationId = typeof args?.correlation_id === 'string' ? args.correlation_id : undefined;
  const correlationId = providedCorrelationId ?? CorrelationContext.generateNew();
  if (providedCorrelationId) {
    CorrelationContext.set({ correlation_id: providedCorrelationId });
  }
  let effectiveCorrelationId = correlationId;

  // Ensure correlation ID is in the args
  const argsWithCorrelation: JsonObject = {
    ...(args ?? {}),
    correlation_id: correlationId,
  };

  // Auto-inject session token for protected commands when not already supplied
  const isProtected = !PUBLIC_COMMANDS.has(command);
  const hasExplicitToken =
    argsWithCorrelation.session_token !== null && argsWithCorrelation.session_token !== undefined ||
    argsWithCorrelation.sessionToken !== null && argsWithCorrelation.sessionToken !== undefined;
  if (isProtected && !hasExplicitToken) {
    const token = await getSessionToken();
    if (token) {
      argsWithCorrelation.sessionToken = token;
      argsWithCorrelation.session_token = token;
    } else {
      const authError: EnhancedError = new Error(
        "Erreur d'authentification. Veuillez vous reconnecter."
      );
      authError.code = 'AUTHENTICATION';
      authError.correlationId = correlationId;
      authError.alreadyLogged = false;
      throw authError;
    }
  }

  try {
    // Log IPC call start
    logger.debug(LogDomain.API, `IPC call started: ${command}`, {
      command,
      correlation_id: correlationId,
      args: sanitizeArgs(args),
      timeout_ms: timeoutMs,
    });

    // Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        logger.warn(LogDomain.API, `IPC call timeout: ${command}`, {
          command,
          correlation_id: correlationId,
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
      // Extract correlation_id echoed back from backend
      const backendCorrelationId = (apiResult as ApiResponse<T> & { correlation_id?: string }).correlation_id ?? correlationId;
      effectiveCorrelationId = backendCorrelationId;

      if (!apiResult.success) {
        const errorMsg = apiResult.error?.message || apiResult.message || 'Unknown error';
        const errorCode = apiResult.error?.code || apiResult.error_code || 'UNKNOWN';

        logger.error(LogDomain.API, `IPC call failed: ${command}`, {
          command,
          correlation_id: backendCorrelationId,
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
        error.correlationId = backendCorrelationId;
        error.alreadyLogged = true;
        throw error;
      }

      // Success with wrapper
      const apiData = apiResult.data as JsonValue;
      data = validator ? validator(apiData) : apiData as T;
    } else if (result && typeof result === 'object' && 'type' in result) {
      // Handle backend response format
      const backendResult = result as BackendResponse<T>;
      effectiveCorrelationId = backendResult.correlation_id ?? effectiveCorrelationId;
      if (backendResult.error) {
        const errObj = typeof backendResult.error === 'string'
          ? { message: backendResult.error, code: 'UNKNOWN', details: undefined }
          : backendResult.error;
        const errorMsg = errObj.message;
        const errorCode = errObj.code;

        logger.error(LogDomain.API, `IPC call failed: ${command}`, {
          command,
          correlation_id: effectiveCorrelationId,
          error: errorMsg,
          error_code: errorCode,
          duration_ms: Math.round(duration),
        });

        // Create a structured error with user-friendly message
        const userFriendlyMessage = getUserFriendlyErrorMessage(errorCode, errorMsg);
        const error: EnhancedError = new Error(userFriendlyMessage);
        error.code = errorCode;
        error.originalMessage = errorMsg;
        error.details = (errObj.details as Record<string, unknown> | null) ?? null;
        error.correlationId = effectiveCorrelationId;
        error.alreadyLogged = true;
        throw error;
      }
      const payload = backendResult.payload as JsonValue;
      data = validator ? validator(payload) : payload as T;
    } else {
      // Direct result (array or object)
      data = validator ? validator(result as JsonValue) : result as T;
    }

    // Log successful response
    logger.info(LogDomain.API, `IPC call completed: ${command}`, {
      command,
      correlation_id: effectiveCorrelationId,
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

    return data;

  } catch (error) {
    const duration = performance.now() - startTime;

    // Properly serialize error for logging
    let errorMessage: string;
    let errorDetails: JsonObject = {};

    if (error instanceof Error) {
      const enhancedError = error as EnhancedError;
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        stack: error.stack ?? null,
        code: enhancedError.code ?? null,
        details: (enhancedError.details ?? null) as JsonValue
      };
    } else if (typeof error === 'object' && error !== null) {
      // Handle backend ApiError format
      if ('error' in error) {
        const errorValue = (error as { error?: JsonValue }).error;
        errorMessage = String(errorValue);
        errorDetails = error as JsonObject;
      } else {
        errorMessage = JSON.stringify(error);
        errorDetails = error as JsonObject;
      }
    } else {
      errorMessage = String(error);
      errorDetails = { message: errorMessage };
    }

    const errorWithFlags = error instanceof Error ? error as EnhancedError : undefined;
    if (!errorWithFlags?.alreadyLogged) {
      logger.error(LogDomain.API, `IPC call error: ${command}`, error instanceof Error ? error : new Error(errorMessage), {
        command,
        correlation_id: effectiveCorrelationId,
        duration_ms: Math.round(duration),
        error_details: errorDetails,
      });
    }

    // Record metric
    recordMetric({
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
function sanitizeArgs(args?: JsonObject): JsonObject | undefined {
  if (!args) return undefined;

  const sensitiveFields = new Set([
    'password',
    'token',
    'refresh_token',
    'session_token',
    'sessiontoken',
    'secret',
    'key',
    'auth',
    'authorization',
  ]);

  const sanitizeValue = (value: JsonValue): JsonValue => {
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
      const entries = Object.entries(value as JsonObject);
      if (entries.length > 10) {
        return `[Object(${entries.length} keys)]`;
      }
      const sanitizedObject: JsonObject = {};
      for (const [key, entryValue] of entries) {
        if (sensitiveFields.has(key.toLowerCase())) {
          sanitizedObject[key] = '[REDACTED]';
        } else if (entryValue !== undefined) {
          sanitizedObject[key] = sanitizeValue(entryValue);
        }
      }
      return sanitizedObject;
    }
    return value;
  };

  return sanitizeValue(args) as JsonObject;
}
