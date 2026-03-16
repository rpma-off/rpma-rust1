import { renderHook, waitFor } from '@testing-library/react';
import { useHealthCheck } from '../useHealthCheck';

const mockSafeInvoke = jest.fn();

jest.mock('@/lib/ipc', () => ({
  safeInvoke: (...args: unknown[]) => mockSafeInvoke(...args),
  IPC_COMMANDS: { SYSTEM_HEALTH_CHECK: 'system_health_check' },
}));

describe('useHealthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a healthy status when the database check succeeds', async () => {
    mockSafeInvoke.mockResolvedValue({ db: true, version: '0.1.0' });

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });

    expect(result.current.status).toEqual({ db: true, version: '0.1.0' });
    expect(result.current.hasFailed).toBe(false);
    expect(mockSafeInvoke).toHaveBeenCalledWith('system_health_check');
  });

  it('marks the banner state as failed when the database check errors', async () => {
    mockSafeInvoke.mockRejectedValue(new Error('Database unavailable'));

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.hasFailed).toBe(true);
    });

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.status).toBeNull();
  });

  it('does not run when disabled', async () => {
    const { result } = renderHook(() => useHealthCheck({ enabled: false }));

    await waitFor(() => {
      expect(result.current.hasFailed).toBe(false);
    });

    expect(result.current.status).toBeNull();
    expect(result.current.isHealthy).toBe(false);
    expect(mockSafeInvoke).not.toHaveBeenCalled();
  });
});
