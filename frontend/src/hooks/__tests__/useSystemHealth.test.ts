import { renderHook, act, waitFor } from '@testing-library/react';
import { useSystemHealth } from '../useSystemHealth';

const mockSafeInvoke = jest.fn();

jest.mock('@/lib/ipc', () => ({
  safeInvoke: (...args: unknown[]) => mockSafeInvoke(...args),
  IPC_COMMANDS: { HEALTH_CHECK: 'health_check' },
}));

describe('useSystemHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns healthy status when health check succeeds', async () => {
    mockSafeInvoke.mockResolvedValue({
      status: 'healthy',
      components: {
        database: { status: 'healthy', message: 'OK', lastChecked: '2026-01-01T00:00:00Z' },
      },
    });

    const { result } = renderHook(() => useSystemHealth({ pollInterval: 60000 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.systemStatus).toBe('healthy');
    expect(result.current.statusDetails).not.toBeNull();
    expect(result.current.statusDetails?.status).toBe('healthy');
  });

  it('returns error status when health check fails', async () => {
    mockSafeInvoke.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useSystemHealth({ pollInterval: 60000 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.systemStatus).toBe('error');
    expect(result.current.statusDetails?.status).toBe('error');
  });

  it('provides a refresh function that re-checks health', async () => {
    mockSafeInvoke.mockResolvedValue({ status: 'healthy' });

    const { result } = renderHook(() => useSystemHealth({ pollInterval: 60000 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSafeInvoke.mockResolvedValue({ status: 'warning' });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.systemStatus).toBe('warning');
    expect(result.current.refreshing).toBe(false);
  });

  it('does not auto-check when autoStart is false', async () => {
    const { result } = renderHook(() =>
      useSystemHealth({ autoStart: false }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSafeInvoke).not.toHaveBeenCalled();
  });
});
