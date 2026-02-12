import type { BackendResponse } from './types';
import { logger, LogContext } from '@/lib/logger';

/**
 * Type-safe response extraction for IPC calls
 */
export function extractAndValidate<T>(
  result: unknown,
  validator?: (data: unknown) => T,
  options: { handleNotFound?: boolean; expectedTypes?: string[] } = {}
): T | null {
  const { handleNotFound = false, expectedTypes = [] } = options;

  if (!result || typeof result !== 'object') {
    logger.warn(LogContext.API, '[IPC] Invalid response format', { result });
    return null;
  }

  const response = result as BackendResponse;

  // Handle ApiResponse wrapper format: { success: boolean, data?: T, error?: ApiError }
  if ('success' in response) {
    if (!response.success) {
      logger.error(LogContext.API, '[IPC] API call failed', { error: response.error });
      return null;
    }
    const data = response.data;
    return validator ? validator(data) : data as T;
  }

  // Handle discriminated union format: { type: "VariantName", ...fields }
  if ('type' in response && typeof response.type === 'string') {
    // Handle NotFound explicitly
    if (handleNotFound && response.type === 'NotFound') {
      return null;
    }

    // Validate expected types if provided
    if (expectedTypes.length > 0 && !expectedTypes.includes(response.type)) {
      logger.warn(LogContext.API, `[IPC] Unexpected response type: ${response.type}, expected one of: ${expectedTypes.join(', ')}`);
      return null;
    }

    // For discriminated unions, the entire response object (minus type) is the data
    const { type, ...data } = response;
    return validator ? validator(data) : data as T;
  }

  // Fallback: treat as direct data
  return validator ? validator(result) : result as T;
}

/**
 * Type-safe IPC response handlers for different response patterns
 */
export const ResponseHandlers = {
  /**
   * Handle discriminated union responses (Rust enum variants)
   */
  discriminatedUnion: <T>(
    expectedType: string,
    validator?: (data: unknown) => T
  ) => (result: unknown): T => {
    return extractAndValidate(result, validator, { expectedTypes: [expectedType] })!;
  },

  /**
   * Handle discriminated union responses that may not be found
   */
  discriminatedUnionNullable: <T>(
    expectedType: string,
    validator?: (data: unknown) => T
  ) => (result: unknown): T | null => {
    return extractAndValidate(result, validator, {
      handleNotFound: true,
      expectedTypes: [expectedType, 'NotFound']
    });
  },

  /**
   * Handle list responses
   */
  list: <T>(
    validator?: (data: unknown) => T
  ) => (result: unknown): T => {
    return extractAndValidate(result, validator, { expectedTypes: ['List'] })!;
  },

  /**
   * Handle statistics responses
   */
  statistics: <T>(
    validator?: (data: unknown) => T
  ) => (result: unknown): T => {
    return extractAndValidate(result, validator, { expectedTypes: ['Statistics'] })!;
  },

  /**
   * Handle ApiResponse wrapper responses
   */
  apiResponse: <T>(
    validator?: (data: unknown) => T
  ) => (result: unknown): T => {
    return extractAndValidate(result, validator)!;
  }
};