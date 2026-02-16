import { toast } from 'sonner';
import { logger } from './logger';
import { CorrelationIdGenerator } from '../logging/types';
import { LogContext } from './logger';

export interface ErrorHandlerOptions {
  domain: string;
  userId?: string;
  component?: string;
  showToast?: boolean;
  toastMessage?: string;
}

const LOG_CONTEXT_VALUES = Object.values(LogContext) as string[];

function toLogContext(domain: string): LogContext {
  return LOG_CONTEXT_VALUES.includes(domain) ? (domain as LogContext) : LogContext.SYSTEM;
}

export const handleError = (
  error: unknown,
  message: string,
  options: ErrorHandlerOptions
): void => {
  // Extract correlation_id from error if it exists, otherwise generate one
  const errorWithCorrelation = error as { correlationId?: string };
  const correlationId = errorWithCorrelation.correlationId || CorrelationIdGenerator.getInstance().generate();

  // Log the error with correlation ID
  logger.error(toLogContext(options.domain), message, {
    error: error instanceof Error ? error.message : String(error),
    correlation_id: correlationId,
    user_id: options.userId,
    component: options.component,
    stack: error instanceof Error ? error.stack : undefined
  });

  // Show user-friendly error message with correlation ID for support
  if (options.showToast !== false) {
    const toastMessage = options.toastMessage || 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
    const fullMessage = `${toastMessage}\n\nID de référence : ${correlationId.substring(0, 12)}...`;
    toast.error(fullMessage, {
      duration: 6000, // Show longer to allow users to copy the ID
    });
  }
};
