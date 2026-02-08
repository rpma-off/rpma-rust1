import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PerformanceTab } from '../PerformanceTab';
import type { UserSession } from '@/lib/backend';

const loggerMock = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logUserAction: jest.fn(),
};

jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => loggerMock,
}));

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    settings: {
      getUserSettings: jest.fn(),
      updateUserPerformance: jest.fn(),
    },
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

const { ipcClient: mockIpcClient } = jest.requireMock('@/lib/ipc') as {
  ipcClient: {
    settings: {
      getUserSettings: jest.Mock;
      updateUserPerformance: jest.Mock;
    };
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
    mockIpcClient.settings.getUserSettings.mockResolvedValue({
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
    mockIpcClient.settings.updateUserPerformance.mockResolvedValue({});
  });

  it('submits backend-compatible snake_case performance keys', async () => {
    render(<PerformanceTab user={user} />);

    const cacheSizeInput = await screen.findByDisplayValue('100');
    fireEvent.change(cacheSizeInput, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));

    await waitFor(() => {
      expect(mockIpcClient.settings.updateUserPerformance).toHaveBeenCalled();
    });

    const payload = mockIpcClient.settings.updateUserPerformance.mock.calls[0][0];
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
