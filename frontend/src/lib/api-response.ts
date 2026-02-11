import type { JsonValue } from '@/types/json';

export interface ApiResponse<T = JsonValue> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export class ApiResponseFactory {
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  static error(message: string, code?: string): ApiResponse {
    return {
      success: false,
      error: message,
      code
    };
  }

  static validationError(message: string, details?: JsonValue | null): ApiResponse {
    return {
      success: false,
      error: message,
      code: 'VALIDATION_ERROR',
      data: details ?? null
    };
  }
}

export function createApiResponse<T>(
  response: ApiResponse<T>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
