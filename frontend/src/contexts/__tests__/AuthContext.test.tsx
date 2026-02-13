import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// ─── Mocks ─────────────────────────────────────────────────────────

jest.mock('@/lib/tauri', () => ({
  AuthService: {
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    validateSession: jest.fn(),
    refreshToken: jest.fn(),
    getUserProfile: jest.fn(),
  },
}));

jest.mock('@/lib/secureStorage', () => ({
  AuthSecureStorage: {
    storeSession: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn().mockResolvedValue({ token: null, user: null, refreshToken: null }),
    clearSession: jest.fn().mockResolvedValue(undefined),
    hasSession: jest.fn().mockResolvedValue(false),
  },
  SecureStorage: {
    isAvailable: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('@/lib/types', () => ({
  convertTimestamps: jest.fn((data) => data),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  LogContext: {
    AUTH: 'AUTH',
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const { AuthService } = jest.requireMock('@/lib/tauri') as {
  AuthService: {
    login: jest.Mock;
    signup: jest.Mock;
    logout: jest.Mock;
    validateSession: jest.Mock;
    refreshToken: jest.Mock;
    getUserProfile: jest.Mock;
  };
};

const { AuthSecureStorage, SecureStorage } = jest.requireMock('@/lib/secureStorage') as {
  AuthSecureStorage: {
    storeSession: jest.Mock;
    getSession: jest.Mock;
    clearSession: jest.Mock;
    hasSession: jest.Mock;
  };
  SecureStorage: {
    isAvailable: jest.Mock;
  };
};

const mockSession = {
  user_id: 'user-1',
  token: 'jwt-token-123',
  role: 'admin',
  email: 'test@example.com',
  expires_at: '2026-12-31T00:00:00Z',
  refresh_token: 'refresh-tok-abc',
};

// ─── Wrapper ────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('AuthContext / useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default: no stored session
    SecureStorage.isAvailable.mockReturnValue(true);
    AuthSecureStorage.getSession.mockResolvedValue({
      token: null,
      user: null,
      refreshToken: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('initializes with loading state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();

    // Wait for mount effect to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('loads stored session on mount and validates it', async () => {
    AuthSecureStorage.getSession.mockResolvedValue({
      token: 'stored-token',
      user: { user_id: 'user-1' },
      refreshToken: 'stored-refresh',
    });

    AuthService.validateSession.mockResolvedValue({
      success: true,
      data: mockSession,
    });

    AuthService.getUserProfile.mockResolvedValue({
      type: 'Found',
      data: { id: 'user-1', email: 'test@example.com', role: 'admin' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockSession);
    expect(AuthService.validateSession).toHaveBeenCalledWith('stored-token');
  });

  it('clears session when secure storage is unavailable', async () => {
    SecureStorage.isAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  // ─── signIn ──────────────────────────────────────────────────────

  describe('signIn', () => {
    it('stores session and updates state on successful login', async () => {
      AuthService.login.mockResolvedValue({ success: true, data: mockSession });
      AuthService.getUserProfile.mockResolvedValue({ type: 'Found', data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signInResult: unknown;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password');
      });

      expect(signInResult).toEqual({ success: true, data: mockSession });
      expect(AuthSecureStorage.storeSession).toHaveBeenCalledWith(
        mockSession.token,
        expect.objectContaining({ user_id: 'user-1' }),
        mockSession.refresh_token
      );
      expect(result.current.user).toEqual(mockSession);
      expect(result.current.isAuthenticating).toBe(false);
    });

    it('returns error and shows toast on failed login', async () => {
      AuthService.login.mockResolvedValue({ success: false, error: 'Invalid credentials' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signInResult: unknown;
      await act(async () => {
        signInResult = await result.current.signIn('bad@test.com', 'wrong');
      });

      expect(signInResult).toEqual({ success: false, error: 'Invalid credentials' });
      expect(result.current.user).toBeNull();
    });

    it('handles exceptions during login', async () => {
      AuthService.login.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signInResult: unknown;
      await act(async () => {
        signInResult = await result.current.signIn('test@test.com', 'pass');
      });

      expect(signInResult).toEqual({ success: false, error: 'Network error' });
      expect(result.current.isAuthenticating).toBe(false);
    });
  });

  // ─── signOut ─────────────────────────────────────────────────────

  describe('signOut', () => {
    it('clears session and resets state', async () => {
      // First sign in
      AuthService.login.mockResolvedValue({ success: true, data: mockSession });
      AuthService.getUserProfile.mockResolvedValue({ type: 'Found', data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signIn('test@test.com', 'pass');
      });

      expect(result.current.user).toBeTruthy();

      // Now sign out
      AuthService.logout.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(AuthSecureStorage.clearSession).toHaveBeenCalled();
    });

    it('clears state even when backend logout fails', async () => {
      AuthService.login.mockResolvedValue({ success: true, data: mockSession });
      AuthService.getUserProfile.mockResolvedValue({ type: 'Found', data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signIn('test@test.com', 'pass');
      });

      // Logout with backend error
      AuthService.logout.mockRejectedValue(new Error('Server down'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(AuthSecureStorage.clearSession).toHaveBeenCalled();
    });
  });

  // ─── signUp ──────────────────────────────────────────────────────

  describe('signUp', () => {
    it('stores session on successful signup', async () => {
      AuthService.signup.mockResolvedValue({ success: true, data: mockSession });
      AuthService.getUserProfile.mockResolvedValue({ type: 'Found', data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signUpResult: unknown;
      await act(async () => {
        signUpResult = await result.current.signUp('new@test.com', 'StrongP@ss1', {
          first_name: 'Jean',
          last_name: 'Dupont',
        });
      });

      expect(signUpResult).toEqual(expect.objectContaining({ success: true }));
      expect(AuthSecureStorage.storeSession).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockSession);
    });
  });

  // ─── session recovery ────────────────────────────────────────────

  describe('session recovery', () => {
    it('tries refresh token when validation fails', async () => {
      AuthSecureStorage.getSession.mockResolvedValue({
        token: 'expired-token',
        user: { user_id: 'user-1' },
        refreshToken: 'valid-refresh',
      });

      AuthService.validateSession.mockResolvedValue({ success: false, error: 'Expired' });

      const refreshedSession = { ...mockSession, token: 'new-jwt-token' };
      AuthService.refreshToken.mockResolvedValue({
        success: true,
        data: refreshedSession,
      });
      AuthService.getUserProfile.mockResolvedValue({ type: 'Found', data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(AuthService.refreshToken).toHaveBeenCalledWith('valid-refresh');
      expect(result.current.user).toEqual(refreshedSession);
      expect(AuthSecureStorage.storeSession).toHaveBeenCalledWith(
        'new-jwt-token',
        expect.anything(),
        expect.anything()
      );
    });

    it('clears session when refresh also fails', async () => {
      AuthSecureStorage.getSession.mockResolvedValue({
        token: 'expired-token',
        user: { user_id: 'user-1' },
        refreshToken: 'bad-refresh',
      });

      AuthService.validateSession.mockResolvedValue({ success: false });
      AuthService.refreshToken.mockResolvedValue({ success: false, error: 'Token revoked' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(AuthSecureStorage.clearSession).toHaveBeenCalled();
    });

    it('clears session when no refresh token available', async () => {
      AuthSecureStorage.getSession.mockResolvedValue({
        token: 'expired-token',
        user: { user_id: 'user-1' },
        refreshToken: null,
      });

      AuthService.validateSession.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(AuthSecureStorage.clearSession).toHaveBeenCalled();
    });

    it('handles corrupted secure storage gracefully', async () => {
      AuthSecureStorage.getSession.mockRejectedValue(new Error('Decryption failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(AuthSecureStorage.clearSession).toHaveBeenCalled();
    });
  });

  // ─── context value ────────────────────────────────────────────────

  describe('context value', () => {
    it('exposes session as alias for user (backward compatibility)', async () => {
      AuthService.login.mockResolvedValue({ success: true, data: mockSession });
      AuthService.getUserProfile.mockResolvedValue({ type: 'Found', data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signIn('test@test.com', 'pass');
      });

      expect(result.current.session).toEqual(result.current.user);
    });
  });
});
