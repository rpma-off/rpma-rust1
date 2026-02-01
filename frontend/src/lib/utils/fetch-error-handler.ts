// Fetch error handler utility

export class FetchError extends Error {
  status?: number;
  code?: string;
  data?: Record<string, unknown>;

  constructor(message: string, code?: string, status?: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'FetchError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export interface FetchErrorInterface {
  message: string;
  status?: number;
  code?: string;
}

export const handleFetchError = (error: unknown, context?: string): FetchError => {
  if (error instanceof Response) {
    // HTTP error response
    return new FetchError(
      `HTTP ${error.status}: ${error.statusText}`,
      'HTTP_ERROR',
      error.status,
      { context }
    );
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    // Network error
    return new FetchError(
      'Network error: Unable to connect to server',
      'NETWORK_ERROR',
      undefined,
      { context }
    );
  }

  if (error instanceof Error) {
    return new FetchError(
      error.message,
      error.name,
      undefined,
      { context }
    );
  }

  return new FetchError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    undefined,
    { context }
  );
};

export const isRetryableError = (error: FetchError): boolean => {
  // Retry on network errors or 5xx server errors
  return error.code === 'NETWORK_ERROR' ||
         (typeof error.status === 'number' && error.status >= 500 && error.status < 600);
};

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { code?: string | number };

  return !!(
    err.code === 'NETWORK_ERROR' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 408
  );
}