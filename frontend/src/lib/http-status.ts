// HTTP status codes

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

// Alias for compatibility
export const HttpStatus = HTTP_STATUS;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  code?: string;
}

export const createApiResponse = <T = unknown>(
  success: boolean,
  data?: T,
  error?: string,
  statusCode?: number
): ApiResponse<T> => {
  return {
    success,
    data,
    error,
    statusCode,
  };
};

export class ApiResponseFactory {
  static success<T = unknown>(data: T, statusCode: number = HTTP_STATUS.OK): ApiResponse<T> {
    return createApiResponse(true, data, undefined, statusCode);
  }

  static error(error: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, code?: string): ApiResponse {
    return { success: false, error, statusCode, code };
  }

  static badRequest(error: string, code?: string): ApiResponse {
    return this.error(error, HTTP_STATUS.BAD_REQUEST, code);
  }

  static unauthorized(error: string = 'Unauthorized', code?: string): ApiResponse {
    return this.error(error, HTTP_STATUS.UNAUTHORIZED, code);
  }

  static forbidden(error: string = 'Forbidden', code?: string): ApiResponse {
    return this.error(error, HTTP_STATUS.FORBIDDEN, code);
  }

  static notFound(error: string = 'Not found', code?: string): ApiResponse {
    return this.error(error, HTTP_STATUS.NOT_FOUND, code);
  }

  static validationError(error: string, code?: string): ApiResponse {
    return this.error(error, HTTP_STATUS.UNPROCESSABLE_ENTITY, code);
  }
}