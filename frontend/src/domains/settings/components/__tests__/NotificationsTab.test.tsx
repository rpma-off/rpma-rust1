import { sendTestNotification } from '../useNotificationSettings';

describe('NotificationsTab', () => {
  it('rejects with not-available error when sending test notifications', async () => {
    await expect(sendTestNotification('tester@example.com', 'token-123'))
      .rejects.toThrow('External notification channels are not available');
  });
});
