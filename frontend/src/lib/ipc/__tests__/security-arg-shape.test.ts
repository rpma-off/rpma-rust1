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

  it('uses camelCase top-level args for security session commands', async () => {
    await ipcClient.security.getActiveSessions('token-a');
    expect(safeInvoke).toHaveBeenCalledWith('get_active_sessions', {
      sessionToken: 'token-a',
    });

    await ipcClient.security.revokeSession('session-1', 'token-a');
    expect(safeInvoke).toHaveBeenCalledWith('revoke_session', {
      sessionId: 'session-1',
      sessionToken: 'token-a',
    });

    await ipcClient.security.revokeAllSessionsExceptCurrent('token-a');
    expect(safeInvoke).toHaveBeenCalledWith(
      'revoke_all_sessions_except_current',
      { sessionToken: 'token-a' }
    );

    await ipcClient.security.updateSessionTimeout(180, 'token-a');
    expect(safeInvoke).toHaveBeenCalledWith('update_session_timeout', {
      timeoutMinutes: 180,
      sessionToken: 'token-a',
    });

    await ipcClient.security.getSessionTimeoutConfig('token-a');
    expect(safeInvoke).toHaveBeenCalledWith('get_session_timeout_config', {
      sessionToken: 'token-a',
    });
  });
});
