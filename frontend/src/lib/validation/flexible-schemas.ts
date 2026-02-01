import { z } from 'zod';

/**
 * Flexible validation schemas for API responses that handle real-world database inconsistencies
 * These schemas are more permissive than input validation schemas
 */

// Helper functions for flexible validation
export const flexibleString = (minLength?: number) =>
  z.string()
    .transform(val => val?.trim() || null)
    .nullish()
    .refine(val => !minLength || !val || val.length >= minLength, {
      message: `String must be at least ${minLength} characters when provided`
    });

export const flexibleEmail = () =>
  z.string()
    .transform(val => val?.trim() || null)
    .nullish()
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: 'Invalid email format'
    });

export const flexiblePhone = () =>
  z.string()
    .transform(val => val?.trim() || null)
    .nullish()
    .refine(val => !val || val.length >= 10, {
      message: 'Phone number must be at least 10 characters when provided'
    });

export const flexibleArray = <T>(itemSchema: z.ZodSchema<T>): z.ZodType<T[]> =>
  z.union([
    z.array(itemSchema),
    z.null(),
    z.undefined()
  ])
  .transform(val => val === null || val === undefined ? [] : val)
  .default([]) as z.ZodType<T[]>;

export const flexibleEnum = <T extends Record<string, string | number>>(enumObject: T) =>
  z.union([
    z.string(),
    z.number(),
    z.null(),
    z.undefined()
  ])
  .transform(val => {
    if (val === null || val === undefined) return null;
    // Check if val is a valid enum value
    const enumValues = Object.values(enumObject);
    if (enumValues.includes(val as string | number)) return val;
    // Return null for invalid enum values to avoid breaking
    return null;
  })
  .nullish();

export const flexibleNumber = () =>
  z.union([
    z.number(),
    z.string().transform(val => {
      const num = Number(val);
      return isNaN(num) ? null : num;
    }),
    z.null(),
    z.undefined()
  ])
  .transform(val => val === null || val === undefined ? null : val)
  .nullish();

export const flexibleBoolean = () =>
  z.union([
    z.boolean(),
    z.string().transform(val => {
      if (val === 'true' || val === '1') return true;
      if (val === 'false' || val === '0') return false;
      return null;
    }),
    z.number().transform(val => val === 1 ? true : val === 0 ? false : null),
    z.null(),
    z.undefined()
  ])
  .transform(val => val === null || val === undefined ? null : val)
  .nullish();

export const flexibleJsonb = () =>
  z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.unknown()),
    z.null(),
    z.undefined(),
    z.string().transform(val => {
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    })
  ])
  .transform(val => val === null || val === undefined ? {} : val)
  .default({});

/**
 * Creates a safe validation function that never throws
 */
export function createSafeValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; data: null; errors: string[] } => {
    try {
      const result = schema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        const errors = result.error.issues.map(issue =>
          `${issue.path.join('.')}: ${issue.message}`
        );
        return { success: false, data: null, errors };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  };
}

/**
 * Validation mode enum
 */
export enum ValidationMode {
  STRICT = 'strict',      // For user input validation
  PERMISSIVE = 'permissive', // For API responses and database data
  BALANCED = 'balanced'   // For internal processing
}

/**
 * Context-aware validation wrapper
 */
export function contextualValidation<T>(
  strictSchema: z.ZodSchema<T>,
  permissiveSchema: z.ZodSchema<T>,
  mode: ValidationMode = ValidationMode.PERMISSIVE
) {
  return mode === ValidationMode.STRICT ? strictSchema : permissiveSchema;
}