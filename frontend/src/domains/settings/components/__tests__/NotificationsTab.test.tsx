import { sendTestNotification } from '../NotificationsTab';

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    settings: {
      getUserSettings: jest.fn(),
      updateUserNotifications: jest.fn(),
    },
    notifications: {
      testConfig: jest.fn(),
    },
  },
}));

const { ipcClient: mockIpcClient } = jest.requireMock('@/lib/ipc') as {
  ipcClient: {
    notifications: {
      testConfig: jest.Mock;
    };
  };
};

describe('NotificationsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses Email channel when sending test notifications', async () => {
    mockIpcClient.notifications.testConfig.mockResolvedValue('ok');

    await sendTestNotification('tester@example.com', 'token-123');

    expect(mockIpcClient.notifications.testConfig).toHaveBeenCalledWith(
      'tester@example.com',
      'Email',
      'token-123'
    );
  });
});
