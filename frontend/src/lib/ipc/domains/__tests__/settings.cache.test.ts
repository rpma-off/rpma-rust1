import { settingsOperations } from '../settings';
import { IPC_COMMANDS } from '../../commands';

jest.mock('../../core', () => ({
  safeInvoke: jest.fn(),
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
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

  it('uses a user-scoped cache key for getUserSettings', async () => {
    cachedInvoke.mockResolvedValue({ profile: {}, preferences: {}, security: {}, performance: {}, accessibility: {}, notifications: {} });

    await settingsOperations.getUserSettings('token-a');

    expect(cachedInvoke).toHaveBeenCalledWith(
      'user-settings:token-a',
      IPC_COMMANDS.GET_USER_SETTINGS,
      { session_token: 'token-a' },
      undefined,
      30000
    );
  });

  it('invalidates the same user-scoped cache key after mutation', async () => {
    safeInvoke.mockResolvedValue('ok');

    await settingsOperations.updateUserPreferences({ language: 'en' }, 'token-b');

    expect(safeInvoke).toHaveBeenCalledWith(
      IPC_COMMANDS.UPDATE_USER_PREFERENCES,
      { request: { language: 'en', session_token: 'token-b' } }
    );
    expect(invalidatePattern).toHaveBeenCalledWith('user-settings:token-b');
  });
});
