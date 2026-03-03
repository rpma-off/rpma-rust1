// API error utilities

import { NextResponse } from 'next/server';
import type { JsonValue } from '@/types/json';

export class ApiError extends Error {
  code?: string;
  status?: number;
  details?: JsonValue | null;
  field?: string;

  constructor(
    message: string,
    codeOrStatus?: string | number,
    statusOrField?: number | string,
    fieldArg?: string
  ) {
    super(message);
    if (typeof codeOrStatus === 'number') {
      this.status = codeOrStatus;
      this.code = undefined;
      this.field = typeof statusOrField === 'string' ? statusOrField : undefined;
      return;
    }

    this.code = codeOrStatus;
    this.status = typeof statusOrField === 'number' ? statusOrField : undefined;
    this.field = fieldArg ?? (typeof statusOrField === 'string' ? statusOrField : undefined);
  }
}

// Alias for compatibility
export const APIError = ApiError;

export const createApiError = (message: string, statusCode: number = 500): ApiError => {
  return new ApiError(message, statusCode.toString());
};

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

export function handleApiError(error: unknown, context?: string): NextResponse {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  const status = error instanceof ApiError && error.status ? error.status : 500;

  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(context && { context }),
    },
    { status }
  );
}
