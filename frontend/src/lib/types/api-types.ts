// Extended types with better type safety
// This file provides type-safe wrappers around auto-generated backend types

import type { ApiError as BaseApiError } from '@/lib/backend';

// Extended API error with better typing
export interface ApiError extends BaseApiError {
  details: Record<string, unknown> | null; // More specific than 'any'
}

// Helper function to create typed API errors
export function createApiError(
  message: string,
  code: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    message,
    code,
    details: details || null,
  };
}

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Helper function to create typed API response
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: ApiError
): ApiResponse<T> {
  const response: ApiResponse<T> = { success };
  
  if (success && data !== undefined) {
    response.data = data;
  }
  
  if (error !== undefined) {
    response.error = error;
  }
  
  return response;
}