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

  it('calls session management commands without sessionToken in payload', async () => {
    await securityOperations.getActiveSessions();
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {});

    await securityOperations.revokeSession('session-1');
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.REVOKE_SESSION, {
      sessionId: 'session-1',
    });

    await securityOperations.revokeAllSessionsExceptCurrent();
    expect(safeInvoke).toHaveBeenCalledWith(
      IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT,
      {}
    );

    await securityOperations.updateSessionTimeout(180);
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeoutMinutes: 180,
    });

    await securityOperations.getSessionTimeoutConfig();
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {});
  });
});
