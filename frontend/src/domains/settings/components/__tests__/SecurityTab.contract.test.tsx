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
    mockSettingsIpc.getActiveSessions.mockResolvedValue([]);
    mockSettingsIpc.getSessionTimeoutConfig.mockResolvedValue({ timeout_minutes: 480 });
  });

  it('calls updateSessionTimeout with selected timeout without session token', async () => {
    render(<SecurityTab user={user} />);

    const timeoutSelect = await screen.findByDisplayValue('8 heures');
    fireEvent.change(timeoutSelect, { target: { value: '240' } });

    await waitFor(() => {
      expect(mockSettingsIpc.updateSessionTimeout).toHaveBeenCalledWith(240);
    });
  });

  it('calls revokeSession with the selected session id without session token', async () => {
    mockSettingsIpc.getActiveSessions.mockResolvedValue([
      {
        id: 'session-2',
        device_info: { device_name: 'MacBook Pro' },
        user_agent: 'Chrome',
        location: 'Paris',
        ip_address: '127.0.0.1',
        last_activity: '2026-03-09T00:00:00.000Z',
      },
    ]);

    render(<SecurityTab user={user} />);

    const revokeButton = await screen.findByRole('button', { name: /révoquer/i });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(mockSettingsIpc.revokeSession).toHaveBeenCalledWith('session-2');
    });
  });
});
