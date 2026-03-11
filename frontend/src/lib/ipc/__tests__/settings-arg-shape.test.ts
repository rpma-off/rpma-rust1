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

  it('calls get_app_settings without sessionToken in payload', async () => {
    await ipcClient.settings.getAppSettings();

    expect(safeInvoke).toHaveBeenCalledWith('get_app_settings', {});
  });

  it('calls get_user_settings without sessionToken in payload', async () => {
    await ipcClient.settings.getUserSettings();

    expect(cachedInvoke).toHaveBeenCalledWith(
      'user-settings',
      'get_user_settings',
      {},
      undefined,
      30000
    );
  });

  it('calls update_user_performance without sessionToken in payload', async () => {
    const request = { cache_enabled: true, cache_size: 150 };

    await ipcClient.settings.updateUserPerformance(request);

    expect(safeInvoke).toHaveBeenCalledWith('update_user_performance', {
      request,
    });
    expect(invalidatePattern).toHaveBeenCalled();
  });

  it('calls session management commands without sessionToken in payload', async () => {
    await ipcClient.settings.getActiveSessions();
    expect(safeInvoke).toHaveBeenCalledWith('get_active_sessions', {});

    await ipcClient.settings.revokeSession('session-1');
    expect(safeInvoke).toHaveBeenCalledWith('revoke_session', {
      sessionId: 'session-1',
    });

    await ipcClient.settings.revokeAllSessionsExceptCurrent();
    expect(safeInvoke).toHaveBeenCalledWith(
      'revoke_all_sessions_except_current',
      {}
    );

    await ipcClient.settings.updateSessionTimeout(240);
    expect(safeInvoke).toHaveBeenCalledWith('update_session_timeout', {
      timeoutMinutes: 240,
    });

    await ipcClient.settings.getSessionTimeoutConfig();
    expect(safeInvoke).toHaveBeenCalledWith('get_session_timeout_config', {});
  });

  it('calls export and consent commands without sessionToken in payload', async () => {
    await ipcClient.settings.exportUserData();
    expect(safeInvoke).toHaveBeenCalledWith('export_user_data', {});

    await ipcClient.settings.getDataConsent();
    expect(safeInvoke).toHaveBeenCalledWith('get_data_consent', {});
  });

  it('calls struct-based settings commands without session_token in nested request', async () => {
    await ipcClient.settings.updateUserProfile(
      { full_name: 'Alice Example' }
    );
    expect(safeInvoke).toHaveBeenCalledWith('update_user_profile', {
      request: {
        full_name: 'Alice Example',
      },
    });

    await ipcClient.settings.uploadUserAvatar(
      'base64',
      'avatar.png',
      'image/png'
    );
    expect(safeInvoke).toHaveBeenCalledWith('upload_user_avatar', {
      request: {
        avatar_data: 'base64',
        mime_type: 'image/png',
      },
    });
  });
});
