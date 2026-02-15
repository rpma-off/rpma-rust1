/**
 * Type Guard Utilities
 *
 * Practical utilities for using the comprehensive type guards
 * in React components and services.
 */

import {
  ValidationResult,
  validateTaskDetailed,
  validateClientDetailed,
  validateIpcResponse,
  validateMultiple,
  assertIsTask,
  assertIsClient,
  assertIsUserAccount,
  isTask,
  isClient,
  isUserAccount
} from './backend-type-guards';
import type { Task, Client } from '@/lib/backend';
import type { UserAccount } from '@/lib/types';

/**
 * React hook for type-safe IPC responses
 */
export function useValidatedIpcResponse<T>(
  response: unknown,
  typeGuard: (data: unknown) => data is T
): ValidationResult<T> {
  return validateIpcResponse(response, typeGuard);
}

/**
 * Utility for handling IPC responses in services
 */
export class IpcResponseHandler {
  static handleTaskResponse(response: unknown): ValidationResult<Task> {
    return validateIpcResponse(response, isTask);
  }

  static handleClientResponse(response: unknown): ValidationResult<Client> {
    return validateIpcResponse(response, isClient);
  }

  static handleUserResponse(response: unknown): ValidationResult<UserAccount> {
    return validateIpcResponse(response, isUserAccount);
  }

  static handleTaskListResponse(response: unknown): ValidationResult<Task[]> {
    const result = validateIpcResponse(response, (data): data is Task[] => {
      return Array.isArray(data) && data.every(isTask);
    });
    return result;
  }

  static handleClientListResponse(response: unknown): ValidationResult<Client[]> {
    const result = validateIpcResponse(response, (data): data is Client[] => {
      return Array.isArray(data) && data.every(isClient);
    });
    return result;
  }
}

/**
 * Error handling utilities
 */
export class ValidationErrorHandler {
  static formatValidationError(result: ValidationResult<unknown>): string {
    if (result.success) return '';

    let message = result.error || 'Validation failed';

    if (result.details && result.details.length > 0) {
      const details = result.details.map(detail =>
        `${detail.field}: ${detail.message}`
      ).join('; ');
      message += ` (${details})`;
    }

    return message;
  }

  static logValidationError(result: ValidationResult<unknown>, context: string) {
    if (!result.success) {
      console.error(`Validation error in ${context}:`, {
        error: result.error,
        details: result.details,
        data: result.data
      });
    }
  }

  static throwOnValidationError<T>(result: ValidationResult<T>, context: string): T {
    if (!result.success) {
      const message = this.formatValidationError(result);
      throw new Error(`${context}: ${message}`);
    }
    return result.data!;
  }
}

/**
 * Data transformation utilities with validation
 */
export class DataTransformer {
  static transformAndValidateTasks(data: unknown): ValidationResult<Task[]> {
    return validateMultiple(
      Array.isArray(data) ? data : [],
      (item) => validateTaskDetailed(item)
    );
  }

  static transformAndValidateClients(data: unknown): ValidationResult<Client[]> {
    return validateMultiple(
      Array.isArray(data) ? data : [],
      (item) => validateClientDetailed(item)
    );
  }

  static safeTransformTask(data: unknown): Task | null {
    try {
      assertIsTask(data);
      return data;
    } catch {
      return null;
    }
  }

  static safeTransformClient(data: unknown): Client | null {
    try {
      assertIsClient(data);
      return data;
    } catch {
      return null;
    }
  }

  static safeTransformUser(data: unknown): UserAccount | null {
    try {
      assertIsUserAccount(data);
      return data;
    } catch {
      return null;
    }
  }
}

/**
 * Development helpers (only in development mode)
 */
export const devValidationHelpers = {
  logTypeCheck: (data: unknown, typeName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Type check for ${typeName}:`, {
        data,
        isValid: true // Would need specific type guard
      });
    }
  },

  warnOnInvalidData: (data: unknown, typeName: string, context: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ Potentially invalid ${typeName} data in ${context}:`, data);
    }
  }
};

/**
 * Example usage patterns
 */
export const usageExamples = {
  // In a React component
  componentExample: `
import { useValidatedIpcResponse, ValidationErrorHandler } from '@/lib/validation/type-guard-utils';

function TaskComponent({ taskData }: { taskData: unknown }) {
  const validation = useValidatedIpcResponse(taskData, isTask);

  if (!validation.success) {
    const errorMessage = ValidationErrorHandler.formatValidationError(validation);
    return <div>Error: {errorMessage}</div>;
  }

  return <div>Task: {validation.data.title}</div>;
}`,

  // In a service
  serviceExample: `
import { IpcResponseHandler, ValidationErrorHandler } from '@/lib/validation/type-guard-utils';

async function fetchTask(id: string): Promise<Task> {
  const response = await ipcInvoke('get_task', { id });
  const validation = IpcResponseHandler.handleTaskResponse(response);

  return ValidationErrorHandler.throwOnValidationError(validation, 'fetchTask');
}`,

  // Data transformation
  transformExample: `
import { DataTransformer } from '@/lib/validation/type-guard-utils';

const tasks = DataTransformer.safeTransformTasks(apiResponse.data);
// tasks is now Task[] | null with full type safety
`
};
