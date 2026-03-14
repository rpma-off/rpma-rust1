import { ipcClient } from '../client';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

describe('ipcClient.security IPC argument shapes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue('ok');
  });

  it('calls security session commands without sessionToken in payload', async () => {
    await ipcClient.security.getActiveSessions();
    expect(safeInvoke).toHaveBeenCalledWith('get_active_sessions', {});

    await ipcClient.security.revokeSession('session-1');
    expect(safeInvoke).toHaveBeenCalledWith('revoke_session', {
      session_id: 'session-1',
    });

    await ipcClient.security.revokeAllSessionsExceptCurrent();
    expect(safeInvoke).toHaveBeenCalledWith(
      'revoke_all_sessions_except_current',
      {}
    );

    await ipcClient.security.updateSessionTimeout(180);
    expect(safeInvoke).toHaveBeenCalledWith('update_session_timeout', {
      timeout_minutes: 180,
    });

    await ipcClient.security.getSessionTimeoutConfig();
    expect(safeInvoke).toHaveBeenCalledWith('get_session_timeout_config', {});
  });
});
