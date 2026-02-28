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

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    settings: {
      getUserSettings: jest.fn(),
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
      getUserSettings: jest.Mock;
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

describe('SecurityTab contracts', () => {
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
    mockIpcClient.settings.getUserSettings.mockResolvedValue({});
    mockIpcClient.settings.getActiveSessions.mockResolvedValue([]);
    mockIpcClient.settings.getSessionTimeoutConfig.mockResolvedValue({ timeout_minutes: 480 });
  });

  it('calls disable2FA with password and session token', async () => {
    mockIpcClient.auth.is2FAEnabled.mockResolvedValue(true);
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('CurrentPass1!');

    render(<SecurityTab user={user} />);

    const twoFaSwitch = await screen.findByRole('switch');
    fireEvent.click(twoFaSwitch);

    await waitFor(() => {
      expect(mockIpcClient.auth.disable2FA).toHaveBeenCalledWith('CurrentPass1!', 'session-token');
    });
    expect(mockIpcClient.auth.is2FAEnabled).toHaveBeenCalledWith('session-token');
    promptSpy.mockRestore();
  });

  it('calls verify2FASetup with verification code, backup codes, and session token', async () => {
    mockIpcClient.auth.is2FAEnabled.mockResolvedValue(false);
    mockIpcClient.auth.enable2FA.mockResolvedValue({ backup_codes: ['b1', 'b2'] });
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('123456');

    render(<SecurityTab user={user} />);

    const twoFaSwitch = await screen.findByRole('switch');
    fireEvent.click(twoFaSwitch);

    await waitFor(() => {
      expect(mockIpcClient.auth.verify2FASetup).toHaveBeenCalledWith(
        '123456',
        ['b1', 'b2'],
        'session-token'
      );
    });
    promptSpy.mockRestore();
  });
});
