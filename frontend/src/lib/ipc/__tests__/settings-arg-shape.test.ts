import { ipcClient } from '../client';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

jest.mock('../cache', () => ({
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
  getCacheStats: jest.fn(),
  invalidateKey: jest.fn(),
  clearCache: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke, invalidatePattern } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

describe('ipcClient.settings IPC argument shapes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue('ok');
    cachedInvoke.mockResolvedValue({
      profile: {},
      preferences: {},
      security: {},
      performance: {},
      accessibility: {},
      notifications: {},
    });
  });

  it('uses top-level sessionToken for get_app_settings', async () => {
    await ipcClient.settings.getAppSettings('token-a');

    expect(safeInvoke).toHaveBeenCalledWith('get_app_settings', {
      sessionToken: 'token-a',
    });
  });

  it('uses top-level sessionToken for get_user_settings', async () => {
    await ipcClient.settings.getUserSettings('token-b');

    expect(cachedInvoke).toHaveBeenCalledWith(
      'user-settings:token-b',
      'get_user_settings',
      { sessionToken: 'token-b' },
      undefined,
      30000
    );
  });

  it('uses top-level sessionToken for update_user_performance', async () => {
    const request = { cache_enabled: true, cache_size: 150 };

    await ipcClient.settings.updateUserPerformance(request, 'token-c');

    expect(safeInvoke).toHaveBeenCalledWith('update_user_performance', {
      request,
      sessionToken: 'token-c',
    });
    expect(invalidatePattern).toHaveBeenCalledWith('user-settings:token-c');
  });

  it('uses camelCase top-level args for session management commands', async () => {
    await ipcClient.settings.getActiveSessions('token-d');
    expect(safeInvoke).toHaveBeenCalledWith('get_active_sessions', {
      sessionToken: 'token-d',
    });

    await ipcClient.settings.revokeSession('session-1', 'token-d');
    expect(safeInvoke).toHaveBeenCalledWith('revoke_session', {
      sessionId: 'session-1',
      sessionToken: 'token-d',
    });

    await ipcClient.settings.revokeAllSessionsExceptCurrent('token-d');
    expect(safeInvoke).toHaveBeenCalledWith(
      'revoke_all_sessions_except_current',
      { sessionToken: 'token-d' }
    );

    await ipcClient.settings.updateSessionTimeout(240, 'token-d');
    expect(safeInvoke).toHaveBeenCalledWith('update_session_timeout', {
      timeoutMinutes: 240,
      sessionToken: 'token-d',
    });

    await ipcClient.settings.getSessionTimeoutConfig('token-d');
    expect(safeInvoke).toHaveBeenCalledWith('get_session_timeout_config', {
      sessionToken: 'token-d',
    });
  });

  it('uses top-level sessionToken for export and consent read commands', async () => {
    await ipcClient.settings.exportUserData('token-e');
    expect(safeInvoke).toHaveBeenCalledWith('export_user_data', {
      sessionToken: 'token-e',
    });

    await ipcClient.settings.getDataConsent('token-e');
    expect(safeInvoke).toHaveBeenCalledWith('get_data_consent', {
      sessionToken: 'token-e',
    });
  });

  it('keeps nested request.session_token for struct-based settings commands', async () => {
    await ipcClient.settings.updateUserProfile(
      { full_name: 'Alice Example' },
      'token-f'
    );
    expect(safeInvoke).toHaveBeenCalledWith('update_user_profile', {
      request: {
        full_name: 'Alice Example',
        session_token: 'token-f',
      },
    });

    await ipcClient.settings.uploadUserAvatar(
      'base64',
      'avatar.png',
      'image/png',
      'token-f'
    );
    expect(safeInvoke).toHaveBeenCalledWith('upload_user_avatar', {
      request: {
        avatar_data: 'base64',
        mime_type: 'image/png',
        session_token: 'token-f',
      },
    });
  });
});
