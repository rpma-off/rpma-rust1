import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SecurityTab } from '../SecurityTab';
import type { UserSession } from '@/lib/backend';

const loggerMock = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logUserAction: jest.fn(),
};

jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => loggerMock,
}));

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    settings: {
      getActiveSessions: jest.fn(),
      getSessionTimeoutConfig: jest.fn(),
      changeUserPassword: jest.fn(),
      revokeSession: jest.fn(),
      updateSessionTimeout: jest.fn(),
    },
    auth: {
      is2FAEnabled: jest.fn(),
      enable2FA: jest.fn(),
      verify2FASetup: jest.fn(),
      disable2FA: jest.fn(),
    },
  },
}));

const { ipcClient: mockIpcClient } = jest.requireMock('@/lib/ipc') as {
  ipcClient: {
    settings: {
      getActiveSessions: jest.Mock;
      getSessionTimeoutConfig: jest.Mock;
      changeUserPassword: jest.Mock;
      revokeSession: jest.Mock;
      updateSessionTimeout: jest.Mock;
    };
    auth: {
      is2FAEnabled: jest.Mock;
      enable2FA: jest.Mock;
      verify2FASetup: jest.Mock;
      disable2FA: jest.Mock;
    };
  };
};

describe('SecurityTab error handling', () => {
  const user = {
    id: 'u1',
    user_id: 'u1',
    username: 'tester',
    email: 'tester@example.com',
    role: 'technician',
    token: 'session-token',
    refresh_token: null,
    expires_at: '',
    last_activity: '',
    created_at: '',
    device_info: null,
    ip_address: null,
    user_agent: null,
    location: null,
    two_factor_verified: false,
    session_timeout_minutes: null,
  } as unknown as UserSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIpcClient.auth.is2FAEnabled.mockResolvedValue(false);
    mockIpcClient.settings.getSessionTimeoutConfig.mockResolvedValue({ timeout_minutes: 480 });
    mockIpcClient.settings.getActiveSessions.mockResolvedValue([]);
  });

  test('falls back to current session when session load fails', async () => {
    mockIpcClient.settings.getActiveSessions.mockRejectedValue(new Error('Failed to load sessions'));

    render(<SecurityTab user={user} />);

    await waitFor(() => {
      expect(screen.getByText('Current Device')).toBeInTheDocument();
    });
  });

  test('shows error when password change fails', async () => {
    mockIpcClient.settings.changeUserPassword.mockRejectedValue(new Error('Mot de passe invalide'));

    render(<SecurityTab user={user} />);

    const currentPasswordInput = await screen.findByLabelText(/mot de passe actuel/i);
    const newPasswordInput = screen.getByLabelText(/nouveau mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer le nouveau mot de passe/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'CurrentPass1!' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123!@#' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123!@#' } });

    fireEvent.click(screen.getByRole('button', { name: /changer le mot de passe/i }));

    await waitFor(() => {
      expect(screen.getByText('Mot de passe invalide')).toBeInTheDocument();
    });
  });

  test('shows validation error for weak password', async () => {
    render(<SecurityTab user={user} />);

    const newPasswordInput = await screen.findByLabelText(/nouveau mot de passe/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmer le nouveau mot de passe/i);

    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /changer le mot de passe/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/au moins 12 caractères/i)
      ).toBeInTheDocument();
    });
  });
});
