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

jest.mock('@/domains/auth', () => ({
  getSessionToken: jest.fn(),
}));

jest.mock('../metrics', () => ({ recordMetric: jest.fn() }));
jest.mock('@/lib/logging', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
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
import { NOT_IMPLEMENTED_COMMANDS } from '../utils';

// Retrieve mock references after all jest.mock calls
const { invoke: mockInvoke } = jest.requireMock('@tauri-apps/api/core') as { invoke: jest.Mock };
const { getSessionToken: mockGetSessionToken } = jest.requireMock(
  '@/domains/auth'
) as { getSessionToken: jest.Mock };

describe('safeInvoke – session_token auto-injection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: successful backend response
    mockInvoke.mockResolvedValue({ success: true, data: 'ok' });
  });

  describe('protected command + token available', () => {
    it('injects both sessionToken and session_token into args sent to invoke', async () => {
      mockGetSessionToken.mockResolvedValue('my-session-token');

      await safeInvoke('task_crud', { request: { action: { action: 'Get', id: '1' } } });

      expect(mockInvoke).toHaveBeenCalledWith(
        'task_crud',
        expect.objectContaining({
          sessionToken: 'my-session-token',
          session_token: 'my-session-token'
        })
      );
    });

    it('injects both token key variants for protected health and telemetry commands', async () => {
      mockGetSessionToken.mockResolvedValue('my-session-token');

      await safeInvoke('health_check');
      await safeInvoke('get_device_info');
      await safeInvoke('get_performance_stats');

      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        'health_check',
        expect.objectContaining({
          sessionToken: 'my-session-token',
          session_token: 'my-session-token'
        })
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        'get_device_info',
        expect.objectContaining({
          sessionToken: 'my-session-token',
          session_token: 'my-session-token'
        })
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        3,
        'get_performance_stats',
        expect.objectContaining({
          sessionToken: 'my-session-token',
          session_token: 'my-session-token'
        })
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
      expect(mockInvoke).toHaveBeenCalledWith(
        'get_active_sessions',
        expect.not.objectContaining({ session_token: 'auto-token' })
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

  describe('correlation_id generation', () => {
    const { CorrelationContext: mockCorrelationContext } = jest.requireMock('@/lib/logging/types') as {
      CorrelationContext: { set: jest.Mock; getCurrentId: jest.Mock; generateNew: jest.Mock };
    };

    it('generates a fresh correlation_id when none is provided in args', async () => {
      mockGetSessionToken.mockResolvedValue('token');
      mockCorrelationContext.generateNew.mockReturnValue('generated-id');

      await safeInvoke('task_crud', {});

      expect(mockCorrelationContext.generateNew).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalledWith(
        'task_crud',
        expect.objectContaining({ correlation_id: 'generated-id' })
      );
    });

    it('uses the provided correlation_id from args without generating a new one', async () => {
      mockGetSessionToken.mockResolvedValue('token');

      await safeInvoke('task_crud', { correlation_id: 'explicit-corr-id' });

      expect(mockCorrelationContext.generateNew).not.toHaveBeenCalled();
      expect(mockCorrelationContext.set).toHaveBeenCalledWith({ correlation_id: 'explicit-corr-id' });
      expect(mockInvoke).toHaveBeenCalledWith(
        'task_crud',
        expect.objectContaining({ correlation_id: 'explicit-corr-id' })
      );
    });

    it('always generates a new correlation_id even when getCurrentId would return a stale value', async () => {
      mockGetSessionToken.mockResolvedValue('token');
      mockCorrelationContext.getCurrentId.mockReturnValue('stale-id');
      mockCorrelationContext.generateNew.mockReturnValue('fresh-id');

      await safeInvoke('task_crud', {});

      // Should use fresh generated ID, not stale getCurrentId value
      expect(mockInvoke).toHaveBeenCalledWith(
        'task_crud',
        expect.objectContaining({ correlation_id: 'fresh-id' })
      );
    });
  });

  describe('NOT_IMPLEMENTED command guard', () => {
    it('throws NOT_IMPLEMENTED error without calling invoke for unimplemented commands', async () => {
      await expect(safeInvoke('enable_2fa', {})).rejects.toMatchObject({
        code: 'NOT_IMPLEMENTED',
      });

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('includes the command name in the error message', async () => {
      await expect(safeInvoke('enable_2fa', {})).rejects.toThrow('enable_2fa');
    });

    it('rejects all known NOT_IMPLEMENTED commands', async () => {
      for (const cmd of NOT_IMPLEMENTED_COMMANDS) {
        mockInvoke.mockClear();
        await expect(safeInvoke(cmd, {})).rejects.toMatchObject({
          code: 'NOT_IMPLEMENTED',
        });
        expect(mockInvoke).not.toHaveBeenCalled();
      }
    });
  });
});
