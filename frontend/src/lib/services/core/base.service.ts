// Base service class with common functionality

import { ApiError } from '@/lib/api-error';

export { ApiError };

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ServiceResponse<T> extends ApiResponse<T> {
  status?: number;
}

export class BaseService {
  protected handleError(error: unknown): ServiceResponse<unknown> {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }

  protected createSuccessResponse<T>(data: T): ServiceResponse<T> {
    return {
      success: true,
      data,
    };
  }
}