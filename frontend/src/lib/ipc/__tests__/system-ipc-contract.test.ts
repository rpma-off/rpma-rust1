import { systemOperations } from '../domains/system';
import { IPC_COMMANDS } from '../commands';

jest.mock('../core', () => ({
  safeInvoke: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../core') as {
  safeInvoke: jest.Mock;
};

describe('systemOperations IPC contract tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue({});
  });

  it('calls safeInvoke with correct parameters for getHealthStatus', async () => {
    await systemOperations.getHealthStatus();

    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_HEALTH_STATUS);
  });

  it('calls safeInvoke with correct parameters for getApplicationMetrics', async () => {
    await systemOperations.getApplicationMetrics();

    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_APPLICATION_METRICS);
  });

  it('calls safeInvoke with correct parameters for getDatabaseStatus', async () => {
    await systemOperations.getDatabaseStatus();

    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.DIAGNOSE_DATABASE);
  });

  it('calls safeInvoke with correct parameters for getDatabaseStats', async () => {
    await systemOperations.getDatabaseStats();

    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_DATABASE_STATS);
  });

  it('calls safeInvoke with correct parameters for getDatabasePoolHealth', async () => {
    await systemOperations.getDatabasePoolHealth();

    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_DATABASE_POOL_HEALTH);
  });

  it('calls safeInvoke with correct parameters for getAppInfo', async () => {
    await systemOperations.getAppInfo();

    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_APP_INFO);
  });

  it('calls safeInvoke with correct parameters for getDeviceInfo', async () => {
    await systemOperations.getDeviceInfo();

    expect(safeInvoke).toHaveBeenCalledWith(IPC_COMMANDS.GET_DEVICE_INFO);
  });
});
