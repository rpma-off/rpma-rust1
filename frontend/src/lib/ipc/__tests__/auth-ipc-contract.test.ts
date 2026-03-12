import { SignupRequestSchema } from '@/lib/validation/ipc-schemas';
import { ipcClient } from '../client';

jest.mock('../core', () => ({
  safeInvoke: jest.fn(),
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
  extractAndValidate: jest.fn(),
}));

const { safeInvoke, cachedInvoke } = jest.requireMock('../core') as {
  safeInvoke: jest.Mock;
  cachedInvoke: jest.Mock;
};

describe('ipcClient.auth IPC contract tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue({
      user_id: 'user-1',
      token: 'jwt-token',
      role: 'admin',
      email: 'test@example.com',
      expires_at: '2026-12-31T00:00:00Z',
    });
    cachedInvoke.mockResolvedValue({
      user_id: 'user-1',
      token: 'jwt-token',
      role: 'admin',
      email: 'test@example.com',
      expires_at: '2026-12-31T00:00:00Z',
    });
  });

  // ─── CRUD Operations ──────────────────────────────────────────────

  describe('login', () => {
    it('passes correct command and nested request to safeInvoke', async () => {
      await ipcClient.auth.login('user@test.com', 'p@ssw0rd');

      expect(safeInvoke).toHaveBeenCalledWith(
        'auth_login',
        { request: { email: 'user@test.com', password: 'p@ssw0rd' } },
        expect.any(Function)
      );
    });

    it('returns the user session from backend', async () => {
      const mockSession = {
        user_id: 'u-123',
        token: 'tok-abc',
        role: 'technician',
        email: 'tech@test.com',
        expires_at: '2026-06-01T00:00:00Z',
      };
      safeInvoke.mockResolvedValueOnce(mockSession);

      const result = await ipcClient.auth.login('tech@test.com', 'secret');
      expect(result).toEqual(mockSession);
    });
  });

  describe('createAccount', () => {
    it('passes signup request to safeInvoke', async () => {
      const request = {
        email: 'new@example.com',
        password: 'StrongP@ss1',
        first_name: 'Jean',
        last_name: 'Dupont',
        role: 'technician' as const,
      };

      await ipcClient.auth.createAccount(request);

      expect(safeInvoke).toHaveBeenCalledWith(
        'auth_create_account',
        { request },
        expect.any(Function)
      );
    });

    it('strips legacy fields from signup request schema', () => {
      const payload = {
        email: 'new@example.com',
        password: 'StrongP@ss1',
        first_name: 'Jean',
        last_name: 'Dupont',
        role: 'technician' as const,
        refresh_token: 'legacy-refresh',
        device_info: { device_type: 'desktop', os: 'windows', browser: null, device_name: null },
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        location: 'Paris',
        two_factor_verified: false,
        session_timeout_minutes: 30,
      };

      const parsed = SignupRequestSchema.parse(payload);

      expect(parsed).toEqual({
        email: 'new@example.com',
        password: 'StrongP@ss1',
        first_name: 'Jean',
        last_name: 'Dupont',
        role: 'technician',
      });
      expect(Object.keys(parsed)).not.toEqual(
        expect.arrayContaining([
          'refresh_token',
          'device_info',
          'ip_address',
          'user_agent',
          'location',
          'two_factor_verified',
          'session_timeout_minutes',
        ])
      );
    });
  });

  describe('logout', () => {
    it('calls safeInvoke with empty payload', async () => {
      safeInvoke.mockResolvedValueOnce(undefined);

      await ipcClient.auth.logout();

      expect(safeInvoke).toHaveBeenCalledWith(
        'auth_logout',
        {}
      );
    });
  });

  describe('validateSession', () => {
    it('calls safeInvoke with empty payload and validator', async () => {
      await ipcClient.auth.validateSession();

      expect(safeInvoke).toHaveBeenCalledWith(
        'auth_validate_session',
        {},
        expect.any(Function)
      );
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────

  describe('error handling', () => {
    it('propagates login errors', async () => {
      safeInvoke.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(
        ipcClient.auth.login('bad@test.com', 'wrong')
      ).rejects.toThrow('Invalid credentials');
    });

    it('propagates session validation errors', async () => {
      safeInvoke.mockRejectedValueOnce(new Error('Session expired'));

      await expect(
        ipcClient.auth.validateSession()
      ).rejects.toThrow('Session expired');
    });
  });
});

