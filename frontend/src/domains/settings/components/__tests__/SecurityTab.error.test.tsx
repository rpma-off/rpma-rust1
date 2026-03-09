import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SecurityTab } from '../SecurityTab';
import type { UserSession } from '@/lib/backend';

const loggerMock = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logUserAction: jest.fn(),
};

jest.mock('@/shared/hooks/useLogger', () => ({
  useLogger: () => loggerMock,
}));

jest.mock('../../ipc/settings.ipc', () => ({
  settingsIpc: {
    getActiveSessions: jest.fn(),
    getSessionTimeoutConfig: jest.fn(),
    changeUserPassword: jest.fn(),
    revokeSession: jest.fn(),
    updateSessionTimeout: jest.fn(),
  },
}));

const { settingsIpc: mockSettingsIpc } = jest.requireMock('../../ipc/settings.ipc') as {
  settingsIpc: {
    getActiveSessions: jest.Mock;
    getSessionTimeoutConfig: jest.Mock;
    changeUserPassword: jest.Mock;
    revokeSession: jest.Mock;
    updateSessionTimeout: jest.Mock;
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
    mockSettingsIpc.getSessionTimeoutConfig.mockResolvedValue({ timeout_minutes: 480 });
    mockSettingsIpc.getActiveSessions.mockResolvedValue([]);
  });

  test('falls back to current session when session load fails', async () => {
    mockSettingsIpc.getActiveSessions.mockRejectedValue(new Error('Failed to load sessions'));

    render(<SecurityTab user={user} />);

    await waitFor(() => {
      expect(screen.getByText('Current Device')).toBeInTheDocument();
    });
  });

  test('shows error when password change fails', async () => {
    mockSettingsIpc.changeUserPassword.mockRejectedValue(new Error('Mot de passe invalide'));

    render(<SecurityTab user={user} />);

    const currentPasswordInput = await screen.findByPlaceholderText(/mot de passe actuel/i);
    const newPasswordInput = screen.getByPlaceholderText('Votre nouveau mot de passe');
    const confirmPasswordInput = screen.getByPlaceholderText(/confirmer votre nouveau mot de passe/i);

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

    const newPasswordInput = await screen.findByPlaceholderText('Votre nouveau mot de passe');
    const confirmPasswordInput = screen.getByPlaceholderText(/confirmer votre nouveau mot de passe/i);

    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /changer le mot de passe/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Le mot de passe doit contenir au moins 12/i)
      ).toBeInTheDocument();
    });
  });
});
