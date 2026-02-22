import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../api/AuthProvider';
import { useAuth } from '../api/useAuth';
import { authIpc } from '../ipc/auth.ipc';
import { AuthSecureStorage, SecureStorage } from '@/lib/secureStorage';
import { toast } from 'sonner';

jest.mock('../ipc/auth.ipc', () => ({
  authIpc: {
    login: jest.fn(),
    createAccount: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    validateSession: jest.fn(),
    getUserProfile: jest.fn(),
    hasAdmins: jest.fn(),
    bootstrapFirstAdmin: jest.fn(),
  },
}));

jest.mock('@/lib/secureStorage', () => ({
  AuthSecureStorage: {
    storeSession: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn().mockResolvedValue({ token: null, user: null, refreshToken: null }),
    clearSession: jest.fn().mockResolvedValue(undefined),
  },
  SecureStorage: {
    isAvailable: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('@/lib/ipc/cache', () => ({
  clearCache: jest.fn(),
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

jest.mock('sonner', () => ({
  __esModule: true,
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockSession = {
  user_id: 'user-1',
  token: 'jwt-token-123',
  role: 'admin',
  email: 'test@example.com',
  expires_at: '2026-12-31T00:00:00Z',
  refresh_token: 'refresh-tok-abc',
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStorage.isAvailable as jest.Mock).mockReturnValue(true);
    (AuthSecureStorage.getSession as jest.Mock).mockResolvedValue({
      token: null,
      user: null,
      refreshToken: null,
    });
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('loads stored session and validates it', async () => {
    (AuthSecureStorage.getSession as jest.Mock).mockResolvedValue({
      token: 'stored-token',
      user: { user_id: 'user-1' },
      refreshToken: 'stored-refresh',
    });

    (authIpc.validateSession as jest.Mock).mockResolvedValue(mockSession);
    (authIpc.getUserProfile as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(authIpc.validateSession).toHaveBeenCalledWith('stored-token');
    expect(result.current.user).toEqual(mockSession);
  });

  it('signIn stores session and updates state', async () => {
    (authIpc.login as jest.Mock).mockResolvedValue(mockSession);
    (authIpc.getUserProfile as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: unknown;
    await act(async () => {
      signInResult = await result.current.signIn('test@example.com', 'password');
    });

    expect(signInResult).toEqual({ success: true, data: mockSession });
    expect(AuthSecureStorage.storeSession).toHaveBeenCalled();
    expect(result.current.user).toEqual(mockSession);
  });

  it('signIn surfaces backend error message in toast', async () => {
    (authIpc.login as jest.Mock).mockRejectedValue(new Error('Session invalide'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn('test@example.com', 'wrong');
    });

    expect(toast.error).toHaveBeenCalledWith('Session invalide');
  });
});
