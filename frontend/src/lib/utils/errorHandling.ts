import { toast } from 'sonner';
import type { ApiError, JsonValue } from '@/lib/backend';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

export interface AppError {
  message: string;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  details?: JsonValue;
  timestamp: Date;
  context?: Record<string, unknown>;
  action?: string;
}

/**
  * Create a standardized error object
  */
export function createError(
  message: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  options?: {
    code?: string;
    details?: JsonValue;
    context?: Record<string, unknown>;
    action?: string;
  }
): AppError {
  return {
    message,
    code: options?.code,
    category,
    severity,
    details: options?.details,
    timestamp: new Date(),
    context: options?.context,
    action: options?.action,
  };
}

/**
 * Handle API errors consistently
 */
export function handleApiError(
  error: unknown,
  context?: Record<string, unknown>
): AppError {
  if (error && typeof error === 'object' && 'code' in error) {
    const apiError = error as ApiError;
    
    // Determine category based on error code
    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    
    if (apiError.code?.startsWith('network_')) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.HIGH;
    } else if (apiError.code?.startsWith('validation_')) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
    } else if (apiError.code?.startsWith('permission_')) {
      category = ErrorCategory.PERMISSION;
      severity = ErrorSeverity.HIGH;
    } else if (apiError.code?.startsWith('not_found_')) {
      category = ErrorCategory.NOT_FOUND;
      severity = ErrorSeverity.LOW;
    } else if (apiError.code?.startsWith('server_')) {
      category = ErrorCategory.SERVER;
      severity = ErrorSeverity.CRITICAL;
    }

    return createError(
      apiError.message || 'An unknown error occurred',
      category,
      severity,
      {
        code: apiError.code,
        details: apiError.details,
        context,
      }
    );
  }

  if (error instanceof Error) {
    return createError(
      error.message,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      {
        context,
        details: error.stack ? { stack: error.stack } : undefined,
      }
    );
  }

  return createError(
    'An unexpected error occurred',
    ErrorCategory.UNKNOWN,
    ErrorSeverity.MEDIUM,
    {
      context,
      details: { originalError: String(error) },
    }
  );
}

/**
 * Display error to user with appropriate toast
 */
export function displayError(error: AppError | string | unknown): void {
  let appError: AppError;

  if (typeof error === 'string') {
    appError = createError(error);
  } else if (error && typeof error === 'object' && 'message' in error) {
    appError = error as AppError;
  } else {
    appError = handleApiError(error);
  }

  // Log error for debugging
  console.error('App Error:', appError);

  // Show appropriate toast based on severity
  switch (appError.severity) {
    case ErrorSeverity.CRITICAL:
      toast.error(appError.message, {
        description: 'A critical error occurred. Please contact support.',
        duration: 10000,
      });
      break;

    case ErrorSeverity.HIGH:
      toast.error(appError.message, {
        description: appError.details ? 'Check console for details.' : undefined,
        duration: 8000,
      });
      break;

    case ErrorSeverity.MEDIUM:
      toast.error(appError.message, {
        duration: 6000,
      });
      break;

    case ErrorSeverity.LOW:
      toast.warning(appError.message, {
        duration: 4000,
      });
      break;
  }
}

/**
 * Display success message
 */
export function displaySuccess(message: string, description?: string): void {
  toast.success(message, {
    description,
    duration: 4000,
  });
}

/**
 * Display info message
 */
export function displayInfo(message: string, description?: string): void {
  toast.info(message, {
    description,
    duration: 4000,
  });
}

/**
  * Display warning message
  */
export function displayWarning(message: string, description?: string): void {
  toast.warning(message, {
    description,
    duration: 5000,
  });
}

/**
  * Custom error class for better error tracking
  */
export class AppException extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, unknown>;
  public readonly action?: string;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options?: {
      code?: string;
      details?: Record<string, unknown>;
      context?: Record<string, unknown>;
      action?: string;
    }
  ) {
    super(message);
    this.name = 'AppException';
    this.category = category;
    this.severity = severity;
    this.context = options?.context;
    this.action = options?.action;

    // Maintain stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): AppError {
    return {
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      action: this.action,
      timestamp: new Date(),
    };
  }
}

/**
  * Async error handler wrapper
  */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: AppError) => void
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = handleApiError(error);
      errorHandler?.(appError);
      displayError(appError);
      throw appError;
    }
  };
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: AppError): boolean {
  return (
    error.category === ErrorCategory.NETWORK ||
    error.category === ErrorCategory.VALIDATION ||
    error.category === ErrorCategory.NOT_FOUND
  );
}

/**
 * Get user-friendly error message based on category
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return 'Connection issue. Please check your internet connection and try again.';
    
    case ErrorCategory.VALIDATION:
      return 'Please check your input and try again.';
    
    case ErrorCategory.PERMISSION:
      return 'You don\'t have permission to perform this action.';
    
    case ErrorCategory.NOT_FOUND:
      return 'The requested item was not found.';
    
    case ErrorCategory.SERVER:
      return 'Server error. Please try again later.';
    
    default:
      return error.message || 'An unexpected error occurred.';
  }
}
