import { notificationApi } from '../notification';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

describe('notificationApi IPC contract tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue({});
  });

  it('calls get_notifications without sessionToken in payload', async () => {
    await notificationApi.get();

    expect(safeInvoke).toHaveBeenCalledWith('get_notifications', {});
  });

  it('calls mark_notification_read without sessionToken in payload', async () => {
    await notificationApi.markRead('notif-1');

    expect(safeInvoke).toHaveBeenCalledWith('mark_notification_read', {
      id: 'notif-1',
    });
  });

  it('calls mark_all_notifications_read without sessionToken in payload', async () => {
    await notificationApi.markAllRead();

    expect(safeInvoke).toHaveBeenCalledWith('mark_all_notifications_read', {});
  });

  it('calls delete_notification without sessionToken in payload', async () => {
    await notificationApi.delete('notif-2');

    expect(safeInvoke).toHaveBeenCalledWith('delete_notification', {
      id: 'notif-2',
    });
  });

  it('keeps request payload shape for create_notification', async () => {
    const request = {
      user_id: 'user-1',
      type: 'task_assigned',
      title: 'Task assigned',
      message: 'You have a new task',
      entity_type: 'task',
      entity_id: 'task-1',
      entity_url: '/tasks/task-1',
      correlation_id: 'corr-1',
    };

    await notificationApi.create(request);

    expect(safeInvoke).toHaveBeenCalledWith('create_notification', {
      request,
    });
  });
});
