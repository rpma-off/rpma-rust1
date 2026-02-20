/**
 * @file unified.types.ts
 * @description Service-layer infrastructure types for RPMA V2.
 *
 * This file contains **utility and infrastructure interfaces** shared across all services:
 * response wrappers (ServiceResponse, ApiResponse), error handling (ApiError),
 * service configuration (RetryOptions, CacheConfig, AuditOptions), pagination helpers
 * (PaginationOptions, SearchOptions), validation types (ValidationResult, ValidationError),
 * utility primitives (EntityId, Timestamp, OperationStatus), and type guards
 * (isServiceResponse, isApiError, isValidationResult).
 *
 * **Use this file when** you need types for service communication, error handling,
 * API response wrapping, or generic utility primitives — not for business entities.
 *
 * @see unified.ts for business-domain entity types (Task, Client, Technician, etc.).
 *
 * @version 1.0
 * @date 2025-01-20
 */

// ==================== SERVICE RESPONSE TYPES ====================

/**
 * Standard service response wrapper for API operations
 */
export interface ServiceResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
  status: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Standard API response format matching Rust backend
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | ApiError;
  message?: string;
  status?: number;
}

// ServiceResponse is now defined above

// ==================== ERROR HANDLING TYPES ====================

/**
 * Custom API Error class for better error handling
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(
    message: string,
    status: number = 500,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// ==================== CONFIGURATION TYPES ====================

/**
 * Retry configuration options for service operations
 */
export interface RetryOptions {
  maxAttempts?: number;
  backoffMs?: number;
  retryableStatuses?: number[];
}

/**
 * Cache configuration for service operations
 */
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string;
}

/**
 * Audit options for tracking service operations
 */
export interface AuditOptions {
  action: string;
  entityId: string;
  entityType: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// ==================== COMMON DTO TYPES ====================

/**
 * Generic pagination options
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generic filter options
 */
export interface FilterOptions {
  [key: string]: unknown;
}

/**
 * Generic search options
 */
export interface SearchOptions extends PaginationOptions {
  query?: string;
  filters?: FilterOptions;
}

// ==================== VALIDATION TYPES ====================

/**
 * Generic validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  fieldErrors?: Record<string, string>;
}

/**
 * Generic validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

// ==================== UTILITY TYPES ====================

/**
 * Generic ID type for database entities
 */
export type EntityId = string | number;

/**
 * Generic timestamp type
 */
export type Timestamp = string;

/**
 * Generic status type for operations
 */
export type OperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Generic result wrapper for operations
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard to check if a value is a ServiceResponse
 */
export function isServiceResponse<T>(obj: unknown): obj is ServiceResponse<T> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'data' in obj &&
    'error' in obj &&
    'status' in obj &&
    'success' in obj
  );
}

/**
 * Type guard to check if a value is an ApiError
 */
export function isApiError(obj: unknown): obj is ApiError {
  return obj instanceof ApiError;
}

/**
 * Type guard to check if a value is a ValidationResult
 */
export function isValidationResult(obj: unknown): obj is ValidationResult {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'isValid' in obj &&
    'errors' in obj &&
    Array.isArray((obj as Record<string, unknown>).errors)
  );
}

// ==================== EXPORTS ====================

// Export all types for convenience
export type {
  ServiceResponse as ServiceResult,
  ApiError as APIError,
  RetryOptions as RetryConfig,
  CacheConfig as CacheOptions,
  AuditOptions as AuditConfig,
  PaginationOptions as PageOptions,
  FilterOptions as FilterConfig,
  SearchOptions as SearchConfig,
  ValidationResult as ValidationResponse,
  ValidationError as FieldError,
  EntityId as ID,
  Timestamp as Time,
  OperationStatus as Status,
  OperationResult as Result
};