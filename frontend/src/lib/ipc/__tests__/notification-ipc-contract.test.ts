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

  it('uses top-level sessionToken for get_notifications', async () => {
    await notificationApi.get('token-a');

    expect(safeInvoke).toHaveBeenCalledWith('get_notifications', {
      sessionToken: 'token-a',
    });
  });

  it('uses top-level sessionToken for mark_notification_read', async () => {
    await notificationApi.markRead('notif-1', 'token-b');

    expect(safeInvoke).toHaveBeenCalledWith('mark_notification_read', {
      id: 'notif-1',
      sessionToken: 'token-b',
    });
  });

  it('uses top-level sessionToken for mark_all_notifications_read', async () => {
    await notificationApi.markAllRead('token-c');

    expect(safeInvoke).toHaveBeenCalledWith('mark_all_notifications_read', {
      sessionToken: 'token-c',
    });
  });

  it('uses top-level sessionToken for delete_notification', async () => {
    await notificationApi.delete('notif-2', 'token-d');

    expect(safeInvoke).toHaveBeenCalledWith('delete_notification', {
      id: 'notif-2',
      sessionToken: 'token-d',
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
