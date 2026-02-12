import { AuthService } from '../auth.service';

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    auth: {
      login: jest.fn(),
      createAccount: jest.fn(),
      logout: jest.fn(),
      validateSession: jest.fn(),
    },
    users: {
      updateEmail: jest.fn(),
      changePassword: jest.fn(),
      banUser: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { ipcClient } = jest.requireMock('@/lib/ipc') as {
  ipcClient: {
    auth: {
      login: jest.Mock;
      createAccount: jest.Mock;
      logout: jest.Mock;
      validateSession: jest.Mock;
    };
    users: {
      updateEmail: jest.Mock;
      changePassword: jest.Mock;
      banUser: jest.Mock;
      delete: jest.Mock;
    };
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

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── login ──────────────────────────────────────────────────────

  describe('login', () => {
    it('returns success with session data on valid credentials', async () => {
      ipcClient.auth.login.mockResolvedValue(mockSession);

      const result = await AuthService.login({ email: 'test@example.com', password: 'password' });

      expect(result).toEqual({ success: true, data: mockSession });
      expect(ipcClient.auth.login).toHaveBeenCalledWith('test@example.com', 'password');
    });

    it('returns error message on failure', async () => {
      ipcClient.auth.login.mockRejectedValue(new Error('Invalid credentials'));

      const result = await AuthService.login({ email: 'bad@test.com', password: 'wrong' });

      expect(result).toEqual({ success: false, error: 'Invalid credentials' });
    });

    it('returns generic error for non-Error throws', async () => {
      ipcClient.auth.login.mockRejectedValue('unknown error');

      const result = await AuthService.login({ email: 'a@b.com', password: 'x' });

      expect(result).toEqual({ success: false, error: 'Login failed' });
    });
  });

  // ─── signup ─────────────────────────────────────────────────────

  describe('signup', () => {
    it('returns success with session data on valid signup', async () => {
      ipcClient.auth.createAccount.mockResolvedValue(mockSession);

      const result = await AuthService.signup({
        email: 'new@example.com',
        password: 'StrongP@ss1',
        firstName: 'Jean',
        lastName: 'Dupont',
        role: 'technician',
      });

      expect(result).toEqual({ success: true, data: mockSession });
      expect(ipcClient.auth.createAccount).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'StrongP@ss1',
        first_name: 'Jean',
        last_name: 'Dupont',
        role: 'technician',
      });
    });

    it('returns error on signup failure', async () => {
      ipcClient.auth.createAccount.mockRejectedValue(new Error('Email already exists'));

      const result = await AuthService.signup({
        email: 'dup@test.com',
        password: 'pass',
        firstName: 'A',
        lastName: 'B',
      });

      expect(result).toEqual({ success: false, error: 'Email already exists' });
    });
  });

  // ─── logout ─────────────────────────────────────────────────────

  describe('logout', () => {
    it('returns success on valid logout', async () => {
      ipcClient.auth.logout.mockResolvedValue(undefined);

      const result = await AuthService.logout('jwt-token-123');

      expect(result).toEqual({ success: true });
      expect(ipcClient.auth.logout).toHaveBeenCalledWith('jwt-token-123');
    });

    it('returns error on logout failure', async () => {
      ipcClient.auth.logout.mockRejectedValue(new Error('Network error'));

      const result = await AuthService.logout('bad-token');

      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });

  // ─── validateSession ───────────────────────────────────────────

  describe('validateSession', () => {
    it('returns success with session data for valid token', async () => {
      ipcClient.auth.validateSession.mockResolvedValue(mockSession);

      const result = await AuthService.validateSession('jwt-token-123');

      expect(result).toEqual({ success: true, data: mockSession });
    });

    it('returns error for expired/invalid token', async () => {
      ipcClient.auth.validateSession.mockRejectedValue(new Error('Session expired'));

      const result = await AuthService.validateSession('expired-token');

      expect(result).toEqual({ success: false, error: 'Session expired' });
    });
  });

  // ─── updateUserEmail ───────────────────────────────────────────

  describe('updateUserEmail', () => {
    it('calls IPC when session token is provided', async () => {
      ipcClient.users.updateEmail.mockResolvedValue(mockSession);

      const result = await AuthService.updateUserEmail('user-1', 'new@test.com', 'tok');

      expect(result).toEqual({ success: true, data: mockSession });
      expect(ipcClient.users.updateEmail).toHaveBeenCalledWith('user-1', 'new@test.com', 'tok');
    });

    it('returns success without IPC when no session token', async () => {
      const result = await AuthService.updateUserEmail('user-1', 'new@test.com');

      expect(result.success).toBe(true);
      expect(ipcClient.users.updateEmail).not.toHaveBeenCalled();
    });
  });

  // ─── updateUserPassword ────────────────────────────────────────

  describe('updateUserPassword', () => {
    it('calls IPC when session token is provided', async () => {
      ipcClient.users.changePassword.mockResolvedValue(undefined);

      const result = await AuthService.updateUserPassword('user-1', 'newPass', 'tok');

      expect(result).toEqual({ success: true });
      expect(ipcClient.users.changePassword).toHaveBeenCalledWith('user-1', 'newPass', 'tok');
    });

    it('returns error on failure', async () => {
      ipcClient.users.changePassword.mockRejectedValue(new Error('Weak password'));

      const result = await AuthService.updateUserPassword('user-1', 'x', 'tok');

      expect(result).toEqual({ success: false, error: 'Weak password' });
    });
  });

  // ─── banUser ───────────────────────────────────────────────────

  describe('banUser', () => {
    it('calls IPC banUser when session token provided', async () => {
      ipcClient.users.banUser.mockResolvedValue(undefined);

      const result = await AuthService.banUser('user-2', 'admin-tok');

      expect(result).toEqual({ success: true });
      expect(ipcClient.users.banUser).toHaveBeenCalledWith('user-2', 'admin-tok');
    });
  });

  // ─── deleteUser ────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('calls IPC delete when session token provided', async () => {
      ipcClient.users.delete.mockResolvedValue(undefined);

      const result = await AuthService.deleteUser('user-2', 'admin-tok');

      expect(result).toEqual({ success: true });
      expect(ipcClient.users.delete).toHaveBeenCalledWith('user-2', 'admin-tok');
    });

    it('returns error on delete failure', async () => {
      ipcClient.users.delete.mockRejectedValue(new Error('Permission denied'));

      const result = await AuthService.deleteUser('user-2', 'viewer-tok');

      expect(result).toEqual({ success: false, error: 'Permission denied' });
    });
  });
});
