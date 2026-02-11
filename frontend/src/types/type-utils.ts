/**
 * Type utilities and helper types
 */

import type { JsonValue } from './json';

/**
 * Make all properties of T optional except for K
 */
export type RequiredExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make all properties of T nullable
 */
export type Nullable<T> = { [P in keyof T]: T[P] | null };

/**
 * Extract the type of an array element
 */
export type ArrayElement<T extends readonly unknown[]> = T extends readonly (infer U)[] ? U : never;

/**
 * Get return type of a function
 */
export type ReturnTypeOf<T> = T extends (...args: never[]) => infer R ? R : never;

/**
 * Get the parameters of a function
 */
export type ParametersOf<T> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Make a type deeply partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract string literal types from a union
 */
export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

/**
 * Create a discriminated union type
 */
export type DiscriminatedUnion<T, K extends keyof T> = T extends Record<string, unknown> ? { [P in K]: T[P] } & T : never;

/**
 * Utility type for API responses
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Utility type for paginated responses
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Utility type for form field errors
 */
export interface FormFieldError {
  field: string;
  message: string;
}

/**
 * Utility type for validation results
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors?: FormFieldError[];
}

/**
 * Utility type for loading states
 */
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error?: string;
}

/**
 * Utility type for async operations
 */
export type AsyncResult<T> = Promise<{ success: true; data: T } | { success: false; error: string }>;

/**
 * Type guard to check if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Safe get function for nested object properties
 */
export function safeGet<T>(obj: Record<string, unknown>, path: string, defaultValue?: T): T | undefined {
  try {
    const result = path.split('.').reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
    return result !== undefined ? result as T : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Normalize error to a standard format
 */
export function normalizeError(error: unknown): { message: string; code?: string } {
  if (error instanceof Error) {
    return { message: error.message };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  if (isObject(error) && 'message' in error) {
    return { message: String(error.message), code: 'code' in error ? String(error.code) : undefined };
  }
  return { message: 'An unknown error occurred' };
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (isObject(error) && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * Safe string conversion
 */
export function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isObject(value)) return JSON.stringify(value);
  return String(value);
}

/**
 * Check if value is a non-null object
 */
export function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return isObject(value) && value !== null;
}

/**
 * Try to convert value to JSON value
 */
export function tryToJsonValue(value: unknown): JsonValue {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as JsonValue;
    } catch {
      return value as JsonValue;
    }
  }
  return value as JsonValue;
}
