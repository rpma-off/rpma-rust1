import { ipcClient } from '../client';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

describe('ipcClient.bootstrap IPC contract tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue('ok');
  });

  it('passes user_id and session_token to safeInvoke', async () => {
    await ipcClient.bootstrap.firstAdmin('user-1', 'session-abc');

    expect(safeInvoke).toHaveBeenCalledWith('bootstrap_first_admin', {
      request: {
        user_id: 'user-1',
        session_token: 'session-abc',
      },
    });
  });

  it('calls has_admins without arguments', async () => {
    safeInvoke.mockResolvedValueOnce(true);

    const result = await ipcClient.bootstrap.hasAdmins();

    expect(safeInvoke).toHaveBeenCalledWith('has_admins');
    expect(result).toBe(true);
  });

  it('propagates bootstrap errors', async () => {
    safeInvoke.mockRejectedValueOnce(new Error('bootstrap failed'));

    await expect(
      ipcClient.bootstrap.firstAdmin('user-1', 'session-abc')
    ).rejects.toThrow('bootstrap failed');
  });
});
