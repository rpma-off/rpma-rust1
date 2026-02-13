/**
 * Retry configuration
 */
import type { JsonValue } from '@/types/json';

type RetryError = Error | JsonValue;

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number; // in ms
  maxDelay?: number; // in ms
  backoffMultiplier?: number;
  jitter?: boolean;
}

/**
 * Default retry configuration
 */
const defaultRetryConfig: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: RetryError): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Don't retry authentication errors
  if (message.includes('401') || message.includes('unauthorized') || message.includes('403') || message.includes('forbidden')) {
    return false;
  }

  // Don't retry validation errors
  if (message.includes('400') || message.includes('bad request') || message.includes('validation')) {
    return false;
  }

  // Retry network errors, timeouts, 500s
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('500') ||
    message.includes('internal server error') ||
    message.includes('502') ||
    message.includes('bad gateway') ||
    message.includes('503') ||
    message.includes('service unavailable') ||
    message.includes('504') ||
    message.includes('gateway timeout')
  ) {
    return true;
  }

  // Default: retry for unknown errors
  return true;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const delay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter up to 25% of the delay
    const jitter = Math.random() * 0.25 * delay;
    return delay + jitter;
  }

  return delay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap an async function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...config };

  let lastError: RetryError | undefined;

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const caughtError = error as RetryError;
      lastError = caughtError;

      if (attempt > finalConfig.maxRetries || !isRetryableError(caughtError)) {
        throw caughtError;
      }

      const delay = calculateDelay(attempt, finalConfig);
      console.log(`[IPC Retry] Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
      await sleep(delay);
    }
  }

  throw lastError!;
}
