import { securityOperations } from '../security';
import { IPC_COMMANDS } from '../../commands';

jest.mock('../../core', () => ({
  safeInvoke: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../../core') as {
  safeInvoke: jest.Mock;
};

describe('securityOperations IPC argument shapes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue('ok');
  });

  it('uses camelCase top-level args for session management commands', async () => {
    await securityOperations.getActiveSessions('token-a');
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {
      sessionToken: 'token-a',
    });

    await securityOperations.revokeSession('session-1', 'token-a');
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.REVOKE_SESSION, {
      sessionId: 'session-1',
      sessionToken: 'token-a',
    });

    await securityOperations.revokeAllSessionsExceptCurrent('token-a');
    expect(safeInvoke).toHaveBeenCalledWith(
      IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT,
      {
        sessionToken: 'token-a',
      }
    );

    await securityOperations.updateSessionTimeout(180, 'token-a');
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeoutMinutes: 180,
      sessionToken: 'token-a',
    });

    await securityOperations.getSessionTimeoutConfig('token-a');
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {
      sessionToken: 'token-a',
    });
  });
});
