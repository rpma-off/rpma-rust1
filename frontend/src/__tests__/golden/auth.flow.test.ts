/**
 * Golden Flow: Authentication
 *
 * Tests the complete auth lifecycle through the IPC layer:
 *   1. Login (success + error)
 *   2. Session validation
 *   3. Logout
 *   4. Missing session_token on protected command
 *   5. ApiResponse + AppError mapping
 */

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));
jest.mock('@/domains/auth/services/sessionToken', () => ({ getSessionToken: jest.fn() }));
jest.mock('@/lib/ipc/metrics', () => ({ recordMetric: jest.fn() }));
jest.mock('@/lib/logging', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/domains/analytics/services/performance-monitor', () => ({
  performanceMonitor: { recordMetric: jest.fn() },
}));
jest.mock('@/lib/logging/types', () => ({
  LogDomain: { API: 'api' },
  CorrelationContext: {
    set: jest.fn(),
    getCurrentId: jest.fn(() => null),
    generateNew: jest.fn(() => 'corr-golden-auth'),
  },
}));

import { safeInvoke } from '@/lib/ipc/utils';
import {
  mockSuccess,
  mockError,
  mockAuthError,
  MOCK_SESSION,
} from '../utils/mock-ipc';

const { invoke: mockInvoke } = jest.requireMock('@tauri-apps/api/core') as {
  invoke: jest.Mock;
};
const { getSessionToken } = jest.requireMock(
  '@/domains/auth/services/sessionToken',
) as { getSessionToken: jest.Mock };

describe('Golden Flow – Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Login success ──────────────────────────────────────────────

  it('completes login and returns user session', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_SESSION, 'corr-1'));

    const result = await safeInvoke('auth_login', {
      request: { email: 'golden@test.com', password: 'P@ss1234' },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'auth_login',
      expect.objectContaining({
        request: { email: 'golden@test.com', password: 'P@ss1234' },
        correlation_id: expect.any(String),
      }),
    );
    expect(result).toEqual(MOCK_SESSION);
  });

  // ─── 2. Login failure (invalid credentials) ───────────────────────

  it('throws user-friendly error on invalid credentials', async () => {
    mockInvoke.mockResolvedValueOnce(
      mockError('AUTHENTICATION', 'Invalid email or password'),
    );

    await expect(
      safeInvoke('auth_login', {
        request: { email: 'bad@test.com', password: 'wrong' },
      }),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION' });
  });

  // ─── 3. Session validation (success) ──────────────────────────────

  it('validates an active session', async () => {
    // auth_validate_session is a public command (no auto-inject)
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_SESSION));

    const result = await safeInvoke('auth_validate_session', {
      token: 'golden-session-token',
    });

    expect(result).toEqual(MOCK_SESSION);
  });

  // ─── 4. Session validation (expired) ──────────────────────────────

  it('throws on expired session', async () => {
    mockInvoke.mockResolvedValueOnce(mockAuthError());

    await expect(
      safeInvoke('auth_validate_session', { token: 'expired-tok' }),
    ).rejects.toMatchObject({ code: 'AUTH_INVALID' });
  });

  // ─── 5. Logout ────────────────────────────────────────────────────

  it('completes logout', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(null));

    const result = await safeInvoke('auth_logout', {
      token: 'golden-session-token',
    });

    expect(result).toBeNull();
  });

  // ─── 6. Protected command without session_token ───────────────────

  it('rejects protected command when no session token is available', async () => {
    getSessionToken.mockResolvedValueOnce(null);

    await expect(safeInvoke('task_crud', { request: {} })).rejects.toMatchObject({
      code: 'AUTHENTICATION',
    });

    // invoke must NOT have been called
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  // ─── 7. Correlation ID propagation ────────────────────────────────

  it('includes correlation_id in the IPC call', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_SESSION));

    await safeInvoke('auth_login', {
      request: { email: 'a@b.com', password: 'pw' },
    });

    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs).toHaveProperty('correlation_id');
    expect(typeof calledArgs.correlation_id).toBe('string');
  });

  // ─── 8. Public commands don't auto-inject session_token ───────────

  it('does not inject session_token for auth_login (public)', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_SESSION));

    await safeInvoke('auth_login', {
      request: { email: 'a@b.com', password: 'pw' },
    });

    expect(getSessionToken).not.toHaveBeenCalled();
    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs.session_token).toBeUndefined();
  });
});
