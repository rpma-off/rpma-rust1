export interface ApiResponse<T = unknown> {
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

  static validationError(message: string, details?: unknown): ApiResponse {
    return {
      success: false,
      error: message,
      code: 'VALIDATION_ERROR',
      data: details
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