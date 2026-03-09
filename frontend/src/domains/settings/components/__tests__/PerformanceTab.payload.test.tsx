import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PerformanceTab } from '../PerformanceTab';
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
    getUserSettings: jest.fn(),
    updateUserPerformance: jest.fn(),
  },
}));

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    performance: {
      getCacheStatistics: jest.fn(),
      clearApplicationCache: jest.fn(),
    },
    sync: {
      syncNow: jest.fn(),
      getStatus: jest.fn(),
      getOperationsForEntity: jest.fn(),
    },
  },
}));

const { settingsIpc: mockSettingsIpc } = jest.requireMock('../../ipc/settings.ipc') as {
  settingsIpc: {
    getUserSettings: jest.Mock;
    updateUserPerformance: jest.Mock;
  };
};

const { ipcClient: mockIpcClient } = jest.requireMock('@/lib/ipc') as {
  ipcClient: {
    performance: {
      getCacheStatistics: jest.Mock;
      clearApplicationCache: jest.Mock;
    };
    sync: {
      syncNow: jest.Mock;
      getStatus: jest.Mock;
      getOperationsForEntity: jest.Mock;
    };
  };
};

describe('PerformanceTab payload shape', () => {
  const user = {
    user_id: 'u1',
    token: 'token-1',
  } as UserSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsIpc.getUserSettings.mockResolvedValue({
      performance: {
        cache_enabled: true,
        cache_size: 100,
        offline_mode: false,
        sync_on_startup: true,
        background_sync: true,
        image_compression: true,
        preload_data: false,
      },
    });
    mockIpcClient.performance.getCacheStatistics.mockResolvedValue({
      total_keys: 0,
      used_memory_bytes: 0,
      used_memory_mb: 0,
      cache_types: [],
    });
    mockIpcClient.sync.getStatus.mockResolvedValue({ status: 'idle' });
    mockIpcClient.sync.getOperationsForEntity.mockResolvedValue([]);
    mockSettingsIpc.updateUserPerformance.mockResolvedValue({});
  });

  it('submits backend-compatible snake_case performance keys', async () => {
    render(<PerformanceTab user={user} />);

    const cacheSizeInput = await screen.findByDisplayValue('100');
    fireEvent.change(cacheSizeInput, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));

    await waitFor(() => {
      expect(mockSettingsIpc.updateUserPerformance).toHaveBeenCalled();
    });

    const payload = mockSettingsIpc.updateUserPerformance.mock.calls[0][0];
    expect(payload).toMatchObject({
      cache_enabled: true,
      cache_size: 120,
      offline_mode: false,
      sync_on_startup: true,
      background_sync: true,
      image_compression: true,
      preload_data: false,
    });
  });
});
