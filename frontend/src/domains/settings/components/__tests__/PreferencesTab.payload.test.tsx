import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PreferencesTab } from '../PreferencesTab';
import type { UserSession } from '@/lib/backend';

const loggerMock = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logUserAction: jest.fn(),
};

jest.mock('@/shared/hooks/useLogger', () => ({
  useLogger: () => loggerMock,
}));

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    settings: {
      getUserSettings: jest.fn(),
      updateUserPreferences: jest.fn(),
      updateUserNotifications: jest.fn(),
      updateUserAccessibility: jest.fn(),
    },
  },
}));

const { ipcClient: mockIpcClient } = jest.requireMock('@/lib/ipc') as {
  ipcClient: {
    settings: {
      getUserSettings: jest.Mock;
      updateUserPreferences: jest.Mock;
      updateUserNotifications: jest.Mock;
      updateUserAccessibility: jest.Mock;
    };
  };
};

describe('PreferencesTab payload shape', () => {
  const user = {
    user_id: 'u1',
    token: 'token-1',
  } as UserSession;

  const settings = {
    preferences: {
      email_notifications: true,
      push_notifications: true,
      task_assignments: true,
      task_updates: true,
      system_alerts: true,
      weekly_reports: false,
      theme: 'system',
      language: 'fr',
      date_format: 'DD/MM/YYYY',
      time_format: '24h',
      high_contrast: false,
      large_text: false,
      reduce_motion: false,
      screen_reader: false,
      auto_refresh: true,
      refresh_interval: 60,
    },
    notifications: {
      email_enabled: true,
      push_enabled: true,
      in_app_enabled: true,
      task_assigned: true,
      task_updated: true,
      task_completed: false,
      task_overdue: true,
      system_alerts: true,
      maintenance: false,
      security_alerts: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      digest_frequency: 'never',
      batch_notifications: false,
      sound_enabled: true,
      sound_volume: 70,
    },
    accessibility: {
      high_contrast: false,
      large_text: false,
      reduce_motion: false,
      screen_reader: false,
      focus_indicators: true,
      keyboard_navigation: true,
      text_to_speech: false,
      speech_rate: 1,
      font_size: 16,
      color_blind_mode: 'none',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIpcClient.settings.getUserSettings.mockResolvedValue(settings);
    mockIpcClient.settings.updateUserPreferences.mockResolvedValue({});
    mockIpcClient.settings.updateUserNotifications.mockResolvedValue({});
    mockIpcClient.settings.updateUserAccessibility.mockResolvedValue({});
  });

  it('submits snake_case notifications payload', async () => {
    render(<PreferencesTab user={user} />);

    const switches = await screen.findAllByRole('switch');
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));

    await waitFor(() => {
      expect(mockIpcClient.settings.updateUserNotifications).toHaveBeenCalled();
    });

    const payload = mockIpcClient.settings.updateUserNotifications.mock.calls[0][0];
    expect(payload).toHaveProperty('email_enabled');
    expect(payload).toHaveProperty('push_enabled');
    expect(payload).toHaveProperty('task_assigned');
    expect(payload).toHaveProperty('digest_frequency');
  });
});
