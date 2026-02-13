import { settingsOperations } from '../domains/settings';

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

describe('Configuration loader via IPC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads app settings via IPC with session token', async () => {
    const mockSettings = {
      general: {
        auto_save: true,
        language: 'fr',
        timezone: 'Europe/Paris',
        date_format: 'DD/MM/YYYY',
        currency: 'EUR',
      },
      security: {
        two_factor_enabled: false,
        session_timeout: 60,
      },
    };

    safeInvoke.mockResolvedValue(mockSettings);

    const result = await settingsOperations.getAppSettings('admin-token');

    expect(safeInvoke).toHaveBeenCalledWith('get_app_settings', {
      sessionToken: 'admin-token',
    });
    expect(result).toEqual(mockSettings);
  });

  it('loads app settings with empty session token when not provided', async () => {
    safeInvoke.mockResolvedValue({});

    await settingsOperations.getAppSettings();

    expect(safeInvoke).toHaveBeenCalledWith('get_app_settings', {
      sessionToken: '',
    });
  });

  it('handles IPC errors gracefully', async () => {
    safeInvoke.mockRejectedValue(new Error('IPC call failed'));

    await expect(settingsOperations.getAppSettings('token')).rejects.toThrow('IPC call failed');
  });
});
