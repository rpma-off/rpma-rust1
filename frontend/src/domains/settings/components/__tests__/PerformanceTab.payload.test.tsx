import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UserSession, UserSettings } from '@/lib/backend';
import { PerformanceTab } from '../PerformanceTab';

const loggerMock = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logUserAction: jest.fn(),
};

jest.mock('@/shared/hooks/useLogger', () => ({
  useLogger: () => loggerMock,
}));

const mockGetUserSettings = jest.fn();
const mockUpdateUserPerformance = jest.fn();

jest.mock('@/lib/ipc/client', () => ({
  useIpcClient: () => ({
    settings: {
      getUserSettings: mockGetUserSettings,
      updateUserPerformance: mockUpdateUserPerformance,
    },
  }),
}));

describe('PerformanceTab payload shape', () => {
  const user = {
    user_id: 'u1',
    token: 'token-1',
  } as UserSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserSettings.mockResolvedValue({
      performance: {
        cache_enabled: true,
        cache_size: 100,
        offline_mode: false,
        sync_on_startup: true,
        background_sync: true,
        image_compression: true,
        preload_data: false,
      },
    } as UserSettings);
    mockUpdateUserPerformance.mockResolvedValue({});
  });

  it('submits backend-compatible snake_case performance keys', async () => {
    render(<PerformanceTab user={user} />);

    const cacheSizeInput = await screen.findByDisplayValue('100');
    fireEvent.change(cacheSizeInput, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));

    await waitFor(() => {
      expect(mockUpdateUserPerformance).toHaveBeenCalled();
    });

    const payload = mockUpdateUserPerformance.mock.calls[0][0];
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
