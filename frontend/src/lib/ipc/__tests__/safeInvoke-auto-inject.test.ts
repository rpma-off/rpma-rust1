/**
 * Unit tests for safeInvoke session_token auto-injection.
 *
 * Verifies:
 *  1. Protected command + token present  → invoke receives session_token
 *  2. Protected command + token absent   → throws AUTHENTICATION error
 *  3. Public command                     → invoke called without injected token
 *  4. Explicit token in args             → existing token is preserved (not overwritten)
 */

// All jest.mock calls must be at the top (they are hoisted before imports)
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@/domains/auth/services/sessionToken', () => ({
  getSessionToken: jest.fn(),
}));

jest.mock('../metrics', () => ({ recordMetric: jest.fn() }));
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
    generateNew: jest.fn(() => 'test-correlation-id'),
  },
}));

import { safeInvoke } from '../utils';

// Retrieve mock references after all jest.mock calls
const { invoke: mockInvoke } = jest.requireMock('@tauri-apps/api/core') as { invoke: jest.Mock };
const { getSessionToken: mockGetSessionToken } = jest.requireMock(
  '@/domains/auth/services/sessionToken'
) as { getSessionToken: jest.Mock };

describe('safeInvoke – session_token auto-injection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: successful backend response
    mockInvoke.mockResolvedValue({ success: true, data: 'ok' });
  });

  describe('protected command + token available', () => {
    it('injects session_token into the args sent to invoke', async () => {
      mockGetSessionToken.mockResolvedValue('my-session-token');

      await safeInvoke('task_crud', { request: { action: { action: 'Get', id: '1' } } });

      expect(mockInvoke).toHaveBeenCalledWith(
        'task_crud',
        expect.objectContaining({ session_token: 'my-session-token' })
      );
    });

    it('does not overwrite an explicitly provided session_token (snake_case)', async () => {
      mockGetSessionToken.mockResolvedValue('auto-token');

      await safeInvoke('task_crud', {
        request: { action: { action: 'Get', id: '1' } },
        session_token: 'explicit-token',
      });

      // getSessionToken should NOT be called when session_token is already present
      expect(mockGetSessionToken).not.toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalledWith(
        'task_crud',
        expect.objectContaining({ session_token: 'explicit-token' })
      );
    });

    it('does not overwrite an explicitly provided sessionToken (camelCase)', async () => {
      mockGetSessionToken.mockResolvedValue('auto-token');

      await safeInvoke('get_active_sessions', { sessionToken: 'camel-token' });

      expect(mockGetSessionToken).not.toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalledWith(
        'get_active_sessions',
        expect.objectContaining({ sessionToken: 'camel-token' })
      );
    });
  });

  describe('protected command + token absent', () => {
    it('throws an AUTHENTICATION error without calling invoke', async () => {
      mockGetSessionToken.mockResolvedValue(null);

      await expect(
        safeInvoke('task_crud', { request: { action: { action: 'List' } } })
      ).rejects.toMatchObject({
        code: 'AUTHENTICATION',
      });

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('throws a user-friendly French error message', async () => {
      mockGetSessionToken.mockResolvedValue(null);

      await expect(
        safeInvoke('client_crud', {})
      ).rejects.toThrow("Erreur d'authentification. Veuillez vous reconnecter.");
    });
  });

  describe('public command', () => {
    it('calls invoke without injecting session_token for auth_login', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        data: { user_id: 'u1', token: 'tok', role: 'admin', email: 'a@b.com', expires_at: '2099-01-01' },
      });

      await safeInvoke('auth_login', { request: { email: 'a@b.com', password: 'pw' } });

      expect(mockGetSessionToken).not.toHaveBeenCalled();
      const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(calledArgs.session_token).toBeUndefined();
    });

    it('does not require a token for has_admins', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: false });

      await safeInvoke('has_admins');

      expect(mockGetSessionToken).not.toHaveBeenCalled();
    });

    it('does not require a token for bootstrap_first_admin', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: null });

      await safeInvoke('bootstrap_first_admin', {
        request: { email: 'admin@test.com', password: 'pass', first_name: 'A', last_name: 'B' },
      });

      expect(mockGetSessionToken).not.toHaveBeenCalled();
    });

    it('does not require a token for UI window commands', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await safeInvoke('ui_window_minimize');

      expect(mockGetSessionToken).not.toHaveBeenCalled();
    });
  });
});

