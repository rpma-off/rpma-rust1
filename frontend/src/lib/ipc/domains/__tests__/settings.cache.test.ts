import { settingsOperations } from '../settings';
import { IPC_COMMANDS } from '../../commands';

jest.mock('../../core', () => ({
  safeInvoke: jest.fn(),
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
}));

jest.mock('@/shared/contracts/session', () => ({
  requireSessionToken: jest.fn().mockResolvedValue('test-session-token'),
  getSessionToken: jest.fn().mockResolvedValue('test-session-token'),
}));

const { safeInvoke, cachedInvoke, invalidatePattern } = jest.requireMock('../../core') as {
  safeInvoke: jest.Mock;
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

describe('settingsOperations cache behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a shared cache key for getUserSettings', async () => {
    cachedInvoke.mockResolvedValue({ profile: {}, preferences: {}, security: {}, performance: {}, accessibility: {}, notifications: {} });

    await settingsOperations.getUserSettings();

    expect(cachedInvoke).toHaveBeenCalledWith(
      'user-settings',
      IPC_COMMANDS.GET_USER_SETTINGS,
      {},
      undefined,
      30000
    );
  });

  it('invalidates the cache key after mutation', async () => {
    safeInvoke.mockResolvedValue('ok');

    await settingsOperations.updateUserPreferences({ language: 'en' });

    expect(safeInvoke).toHaveBeenCalledWith(
      IPC_COMMANDS.UPDATE_USER_PREFERENCES,
      { request: { language: 'en' } }
    );
    expect(invalidatePattern).toHaveBeenCalled();
  });

  it('uses camelCase top-level args for non-struct settings commands', async () => {
    safeInvoke.mockResolvedValue('ok');

    await settingsOperations.updateUserPerformance({ cache_enabled: true });
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.UPDATE_USER_PERFORMANCE, {
      request: { cache_enabled: true },
    });

    await settingsOperations.getActiveSessions();
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {});

    await settingsOperations.revokeSession('session-1');
    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.REVOKE_SESSION, {
      session_id: 'session-1',
    });
  });
});
