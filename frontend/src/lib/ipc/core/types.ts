import type { ApiError } from '@/lib/backend';

/**
 * IPC Response wrapper that can contain either:
 * 1. A discriminated union response (e.g., TaskResponse with { type: "Created", ...fields })
 * 2. An ApiResponse wrapper (e.g., { success: boolean, data?: T, error?: ApiError })
 */
export interface BackendResponse<T = unknown> {
  // For discriminated unions (Rust enums)
  type?: string;
  // For ApiResponse wrappers
  success?: boolean;
  data?: T;
  error?: string | ApiError;
  // Correlation ID for end-to-end tracing
  correlation_id?: string;
  // Allow any other fields from the discriminated union
  [key: string]: unknown;
}
