/**
 * Mock IPC helpers for Golden Flow tests.
 *
 * Provides configurable success/error/auth-failure responses
 * that mirror the real Tauri IPC backend contract.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types matching the backend ApiResponse / AppError contract ──────

export interface MockApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
  correlation_id?: string;
}

export interface MockApiError {
  success: false;
  error: { message: string; code: string; details?: any };
  error_code?: string;
  message?: string;
  correlation_id?: string;
}

export type MockApiResponse<T = any> = MockApiSuccess<T> | MockApiError;

// ── Factory helpers ─────────────────────────────────────────────────

export function mockSuccess<T>(data: T, correlationId?: string): MockApiSuccess<T> {
  return { success: true, data, correlation_id: correlationId };
}

export function mockError(
  code: string,
  message: string,
  correlationId?: string,
): MockApiError {
  return {
    success: false,
    error: { message, code },
    error_code: code,
    message,
    correlation_id: correlationId,
  };
}

export function mockAuthError(correlationId?: string): MockApiError {
  return mockError('AUTH_INVALID', 'Invalid session token', correlationId);
}

export function mockValidationError(message: string, correlationId?: string): MockApiError {
  return mockError('VALIDATION_ERROR', message, correlationId);
}

export function mockNotFoundError(message: string, correlationId?: string): MockApiError {
  return mockError('NOT_FOUND', message, correlationId);
}

// ── Mock session data ───────────────────────────────────────────────

export const MOCK_SESSION = {
  user_id: 'user-golden-1',
  token: 'golden-session-token',
  role: 'admin',
  email: 'golden@test.com',
  expires_at: '2099-12-31T23:59:59Z',
} as const;

export const MOCK_TASK = {
  id: 'task-golden-1',
  task_number: 'TASK-0001',
  title: 'Golden Flow Task',
  status: 'pending',
  priority: 'medium',
  client_id: 'client-golden-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as const;
