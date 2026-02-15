import { createApiError } from './api-types';
import type { ApiError } from '@/lib/backend';

// Type validation error
export class TypeValidationError extends Error {
  public readonly path: string[];
  public readonly expectedType: string;
  public readonly receivedType: string;

  constructor(message: string, path: string[], expectedType: string, receivedType: string) {
    super(message);
    this.name = 'TypeValidationError';
    this.path = path;
    this.expectedType = expectedType;
    this.receivedType = receivedType;
  }
}

// Type guard utilities
export const TypeGuards = {
  // Object type guards
  isObject: (value: unknown): value is Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },

  isArray: (value: unknown): value is unknown[] => {
    return Array.isArray(value);
  },

  isString: (value: unknown): value is string => {
    return typeof value === 'string';
  },

  isNumber: (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value);
  },

  isBoolean: (value: unknown): value is boolean => {
    return typeof value === 'boolean';
  },

  isDate: (value: unknown): value is Date => {
    return value instanceof Date && !isNaN(value.getTime());
  },

  // Specific type guards for our domain types
  isTaskId: (value: unknown): value is string => {
    return typeof value === 'string' && /^[a-f0-9-]{8,}-?[a-f0-9-]{4}$/.test(value);
  },

  isClientId: (value: unknown): value is string => {
    return typeof value === 'string' && /^[a-f0-9-]{8,}-?[a-f0-9-]{4}$/.test(value);
  },

  isEmail: (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  isPhoneNumber: (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{1,4}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
  },

  // Date string validators
  isISODateString: (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;
    return isoRegex.test(value);
  },

  isTimestampString: (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    // Check for Unix timestamp or ISO date
    return !isNaN(Date.parse(value));
  },
};

// Runtime type validation
export const RuntimeTypeValidator = {
  // Validates object structure
  validateObject: (
    obj: unknown,
    requiredKeys: string[],
    optionalKeys: string[] = []
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!TypeGuards.isObject(obj)) {
      return {
        valid: false,
        errors: ['Value is not an object']
      };
    }

    // Check required keys
    for (const key of requiredKeys) {
      if (!(key in obj)) {
        errors.push(`Missing required property: ${key}`);
      }
    }

    // Check types of keys
    for (const key in obj) {
      if (obj[key] === null || obj[key] === undefined) {
        if (requiredKeys.includes(key)) {
          errors.push(`Property ${key} is required but is ${obj[key]}`);
        }
      } else if (!optionalKeys.includes(key)) {
        errors.push(`Property ${key} is ${obj[key]} but should be removed`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validates array structure
  validateArray: (
    arr: unknown,
    itemValidator: (item: unknown) => boolean,
    options: { minLength?: number; maxLength?: number } = {}
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!TypeGuards.isArray(arr)) {
      return {
        valid: false,
        errors: ['Value is not an array']
      };
    }

    const { minLength = 0, maxLength = Infinity } = options;
    
    if (arr.length < minLength) {
      errors.push(`Array minimum length is ${minLength}, got ${arr.length}`);
    }
    
    if (arr.length > maxLength) {
      errors.push(`Array maximum length is ${maxLength}, got ${arr.length}`);
    }

    for (let i = 0; i < arr.length; i++) {
      if (!itemValidator(arr[i])) {
        errors.push(`Item at index ${i} failed validation`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validates string with constraints
  validateString: (
    str: unknown,
    options: { minLength?: number; maxLength?: number; pattern?: RegExp } = {}
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!TypeGuards.isString(str)) {
      return {
        valid: false,
        errors: ['Value is not a string']
      };
    }

    const { minLength = 0, maxLength = Infinity, pattern } = options;
    
    if (str.length < minLength) {
      errors.push(`String minimum length is ${minLength}, got ${str.length}`);
    }
    
    if (str.length > maxLength) {
      errors.push(`String maximum length is ${maxLength}, got ${str.length}`);
    }
    
    if (pattern && !pattern.test(str)) {
      errors.push('String does not match required pattern');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },
};

// Safe property access
export const SafeAccess = {
  // Safely get nested object property
  nested: (obj: unknown, path: string[]): unknown => {
    return path.reduce((current, key) => {
      if (TypeGuards.isObject(current) && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  },

  // Safely get object property with fallback
  withFallback: <T>(obj: unknown, key: string, fallback: T): T => {
    if (TypeGuards.isObject(obj) && key in obj) {
      return (obj as Record<string, unknown>)[key] as T;
    }
    return fallback;
  },
};

// API response validation
export const ApiResponseValidator = {
  // Validate API response structure
  validate: <T>(
    response: unknown,
    dataValidator: (data: unknown) => data is T
  ): { success: boolean; data?: T; error?: ApiError } => {
    if (!TypeGuards.isObject(response)) {
      return {
        success: false,
        error: createApiError('Invalid response format', 'INVALID_RESPONSE', {
          received: typeof response,
        })
      };
    }

    const apiResponse = response as Record<string, unknown>;
    
    if (!('success' in apiResponse)) {
      return {
        success: false,
        error: createApiError('Missing success field', 'MISSING_FIELD', {
          received: Object.keys(apiResponse).join(', '),
        })
      };
    }

    if (apiResponse.success && apiResponse.data && !dataValidator(apiResponse.data)) {
      return {
        success: false,
        error: createApiError('Invalid data structure', 'INVALID_DATA', {
          received: typeof apiResponse.data,
        })
      };
    }

    if (!apiResponse.success && apiResponse.error) {
      return {
        success: false,
        error: apiResponse.error as ApiError
      };
    }

    return {
      success: true,
      data: apiResponse.data as T | undefined
    };
  },
};
