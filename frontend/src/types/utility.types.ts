/**
 * @file src/types/utility.types.ts
 * @description This file contains reusable utility types used throughout the application.
 * These types help in creating more specific and safe type definitions, reducing the need for `any`.
 */

import type { JsonValue } from './json';

// #region JSON Types
export type { JsonPrimitive, JsonValue, JsonArray, JsonObject } from './json';
// #endregion

// #region Record Utility Types
/**
 * Represents a record with unknown values. It is a type-safe alternative
 * to `Record<string, any>` when the structure of an object is truly unknown.
 * It forces type checking or casting before use.
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * Represents a record with string values. Useful for headers, query parameters, etc.
 */
export type StringRecord = Record<string, string>;
// #endregion

// #region Error Handling Types
/**
 * Extends the base Error object to include an optional context property.
 * This is useful for providing more detailed debugging information in logs
 * and error reporting services without resorting to `any`.
 */
export interface ErrorWithContext extends Error {
  context?: UnknownRecord;
}

/**
 * A type guard to check if an error object is an instance of Error.
 * @param error The error object to check.
 * @returns True if the object is an Error instance.
 */
export const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};
// #endregion

// #region General Utility Types
/**
 * Makes specified keys of an interface optional.
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specified keys of an interface required.
 */
export type Required<T, K extends keyof T> = Omit<T, K> & NonNullable<Pick<T, K>>;

/**
 * Represents a value that can be either a single item or an array of that item.
 */
export type OneOrMany<T> = T | T[];
// #endregion

// #region Service and Validation Types
/**
 * A record type specifically for JSON objects with string keys.
 */
export type JsonRecord = Record<string, JsonValue>;

/**
 * A record type for metadata objects.
 */
export type MetadataRecord = Record<string, unknown>;

/**
 * Standard service response type for all service operations.
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T | null;
  error?: Error | null;
  message?: string;
  status?: number;
  metadata?: MetadataRecord;
}

/**
 * Validation error type for form and data validation.
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Result type for validation operations.
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}
// #endregion

// #region API and HTTP Types
/**
 * Standard API response wrapper type for consistency across all endpoints.
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string | null;
  message?: string;
  status: number;
  success: boolean;
}

/**
 * HTTP method types for type-safe API calls.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Request configuration type for API calls.
 */
export interface RequestConfig {
  method?: HttpMethod;
  headers?: HeadersRecord;
  body?: JsonValue;
  params?: StringRecord;
  timeout?: number;
}

/**
 * Headers type for HTTP requests.
 */
export type HeadersRecord = Record<string, string>;

/**
 * Query parameters type for API requests.
 */
export type QueryParamsRecord = Record<string, string | number | boolean | undefined>;
// #endregion

// #region Database and Storage Types
/**
 * Generic database record with standard audit fields.
 */
export interface BaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Audit trail fields for database records.
 */
export interface AuditFields {
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Pagination parameters for database queries.
 */
export interface PaginationParams {
  offset?: number;
  limit?: number;
  page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper for lists.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Filter parameters for database queries.
 */
export type FilterParams = Record<string, JsonValue>;
// #endregion

// #region Form and Input Types
/**
 * Form field configuration for dynamic form generation.
 */
export interface FormFieldConfig {
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date';
  label: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: JsonValue;
  options?: Array<{ label: string; value: JsonValue }>;
  validation?: ValidationRule[];
}

/**
 * Validation rule for form fields.
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: JsonValue;
  message: string;
}

/**
 * Form state for managing form data and validation.
 */
export interface FormState<T = JsonRecord> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}
// #endregion

// #region Event and Callback Types
/**
 * Standard event handler type for React components.
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

/**
 * Callback function with optional data parameter.
 */
export type Callback<T = unknown> = (data?: T) => void | Promise<void>;

/**
 * Error callback for handling async operation failures.
 */
export type ErrorCallback = (error: Error | string) => void;

/**
 * Success callback for handling async operation success.
 */
export type SuccessCallback<T = unknown> = (data: T) => void;

/**
 * Generic async operation result.
 */
export interface AsyncResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}
// #endregion

// #region Configuration and Environment Types
/**
 * Environment configuration type.
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_URL: string;
  DATABASE_URL?: string;
  [key: string]: string | undefined;
}

/**
 * Feature flag configuration.
 */
export interface FeatureFlags {
  [feature: string]: boolean;
}

/**
 * Application configuration type.
 */
export interface AppConfig {
  environment: EnvironmentConfig;
  features: FeatureFlags;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  ui: {
    theme: string;
    language: string;
  };
}
// #endregion

// #region Type Utility Functions
/**
 * Normalizes an error to a consistent Error object
 */
export const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return new Error(error.message);
    }
    return new Error(JSON.stringify(error));
  }
  return new Error('Unknown error occurred');
};

/**
 * Gets a user-friendly error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
  }
  return 'An unknown error occurred';
};

/**
 * Safely converts a value to a string
 */
export const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
};

/**
 * Safely converts a value to a number
 */
export const safeNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return null;
};

/**
 * Type guard to check if a value is a non-null object
 */
export const isNonNullObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};
// #endregion
