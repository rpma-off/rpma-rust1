import { ipcClient } from '../client';
import { SignupRequestSchema } from '@/lib/validation/ipc-schemas';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

jest.mock('../cache', () => ({
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
  getCacheStats: jest.fn(),
  invalidateKey: jest.fn(),
  clearCache: jest.fn(),
}));

jest.mock('@/lib/validation/backend-type-guards', () => ({
  validateUserSession: jest.fn((data) => data),
  validateTask: jest.fn((data) => data),
  validateClient: jest.fn((data) => data),
  validateIntervention: jest.fn((data) => data),
  validateInterventionStep: jest.fn((data) => data),
  validateStartInterventionResponse: jest.fn((data) => data),
  validateTaskListResponse: jest.fn((data) => data),
}));

jest.mock('../core', () => ({
  extractAndValidate: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke } = jest.requireMock('../cache') as {
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

  describe('refreshToken', () => {
    it('passes refresh token to safeInvoke', async () => {
      await ipcClient.auth.refreshToken('refresh-tok-xyz');

      expect(safeInvoke).toHaveBeenCalledWith(
        'auth_refresh_token',
        { refreshToken: 'refresh-tok-xyz' },
        expect.any(Function)
      );
    });
  });

  describe('logout', () => {
    it('passes token to safeInvoke without validator', async () => {
      safeInvoke.mockResolvedValueOnce(undefined);

      await ipcClient.auth.logout('session-token-abc');

      expect(safeInvoke).toHaveBeenCalledWith(
        'auth_logout',
        { token: 'session-token-abc' }
      );
    });
  });

  describe('validateSession', () => {
    it('uses cachedInvoke with correct cache key and TTL', async () => {
      const token = 'my-session-token';

      await ipcClient.auth.validateSession(token);

      expect(cachedInvoke).toHaveBeenCalledWith(
        `auth:session:${token}`,
        'auth_validate_session',
        { token },
        expect.any(Function),
        30000
      );
    });
  });

  // ─── 2FA Operations ──────────────────────────────────────────────

  describe('enable2FA', () => {
    it('passes session_token (snake_case) to safeInvoke', async () => {
      await ipcClient.auth.enable2FA('tok-abc');

      expect(safeInvoke).toHaveBeenCalledWith(
        'enable_2fa',
        { session_token: 'tok-abc' }
      );
    });
  });

  describe('verify2FASetup', () => {
    it('passes verification_code, backup_codes, and session_token', async () => {
      const backupCodes = ['code1', 'code2', 'code3'];
      safeInvoke.mockResolvedValueOnce(undefined);

      await ipcClient.auth.verify2FASetup('123456', backupCodes, 'tok-abc');

      expect(safeInvoke).toHaveBeenCalledWith(
        'verify_2fa_setup',
        {
          verification_code: '123456',
          backup_codes: backupCodes,
          session_token: 'tok-abc',
        }
      );
    });
  });

  describe('disable2FA', () => {
    it('passes password and session_token', async () => {
      safeInvoke.mockResolvedValueOnce(undefined);

      await ipcClient.auth.disable2FA('myPassword', 'tok-abc');

      expect(safeInvoke).toHaveBeenCalledWith(
        'disable_2fa',
        { password: 'myPassword', session_token: 'tok-abc' }
      );
    });
  });

  describe('regenerateBackupCodes', () => {
    it('passes session_token to safeInvoke', async () => {
      await ipcClient.auth.regenerateBackupCodes('tok-abc');

      expect(safeInvoke).toHaveBeenCalledWith(
        'regenerate_backup_codes',
        { session_token: 'tok-abc' }
      );
    });
  });

  describe('is2FAEnabled', () => {
    it('passes session_token to safeInvoke', async () => {
      safeInvoke.mockResolvedValueOnce(true);

      const result = await ipcClient.auth.is2FAEnabled('tok-abc');

      expect(safeInvoke).toHaveBeenCalledWith(
        'is_2fa_enabled',
        { session_token: 'tok-abc' }
      );
      expect(result).toBe(true);
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
      cachedInvoke.mockRejectedValueOnce(new Error('Session expired'));

      await expect(
        ipcClient.auth.validateSession('expired-token')
      ).rejects.toThrow('Session expired');
    });

    it('propagates 2FA errors', async () => {
      safeInvoke.mockRejectedValueOnce(new Error('Invalid TOTP code'));

      await expect(
        ipcClient.auth.verify2FASetup('000000', [], 'tok-abc')
      ).rejects.toThrow('Invalid TOTP code');
    });
  });
});
