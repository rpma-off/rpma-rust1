/**
 * Shared validation utilities for consistent validation patterns across the application
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Base validation function type
 */
export type ValidationFunction<T> = (data: T) => ValidationResult;

/**
 * Creates a validation result
 */
export const createValidationResult = (
  isValid: boolean,
  errors: Record<string, string> = {}
): ValidationResult => ({
  isValid,
  errors
});

/**
 * Validates that a string field is not empty
 */
export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value?.trim()) {
    return `${fieldName} est requis`;
  }
  return null;
};

/**
 * Validates string length
 */
export const validateLength = (
  value: string,
  fieldName: string,
  min?: number,
  max?: number
): string | null => {
  if (min !== undefined && value.length < min) {
    return `${fieldName} doit contenir au moins ${min} caractères`;
  }
  if (max !== undefined && value.length > max) {
    return `${fieldName} ne doit pas dépasser ${max} caractères`;
  }
  return null;
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): string | null => {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Format d\'email invalide';
  }
  return null;
};

/**
 * Validates phone number format (French format)
 */
export const validatePhone = (phone: string): string | null => {
  if (phone && !/^(\+33|0)[1-9](\d{8})$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    return 'Format de téléphone invalide (ex: 06 12 34 56 78 ou +33 6 12 34 56 78)';
  }
  return null;
};

/**
 * Validates date is not in the past
 */
export const validateFutureDate = (dateString: string, fieldName: string): string | null => {
  if (!dateString) return null;

  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return `${fieldName} ne peut pas être dans le passé`;
  }
  return null;
};

/**
 * Validates date is within reasonable bounds
 */
export const validateDateRange = (
  dateString: string,
  fieldName: string,
  maxYearsAhead: number = 1
): string | null => {
  if (!dateString) return null;

  const selectedDate = new Date(dateString);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + maxYearsAhead);

  if (selectedDate > maxDate) {
    return `${fieldName} ne peut pas dépasser ${maxYearsAhead} an${maxYearsAhead > 1 ? 's' : ''}`;
  }
  return null;
};

/**
 * Validates year is within reasonable bounds
 */
export const validateYear = (yearString: string, fieldName: string): string | null => {
  if (!yearString) return null;

  const year = parseInt(yearString, 10);
  const currentYear = new Date().getFullYear();

  if (isNaN(year) || year < 1900 || year > currentYear + 1) {
    return `${fieldName} doit être entre 1900 et ${currentYear + 1}`;
  }
  return null;
};

/**
 * Combines multiple validation errors into a single result
 */
export const combineValidationErrors = (...errors: (string | null)[]): ValidationResult => {
  const errorMessages: Record<string, string> = {};

  errors.forEach((error, index) => {
    if (error) {
      errorMessages[`field_${index}`] = error;
    }
  });

  return createValidationResult(Object.keys(errorMessages).length === 0, errorMessages);
};