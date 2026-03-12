import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettings } from '../api/useSettings';
import { DEFAULT_USER_SETTINGS } from '../api/defaults';

// ── Mocks ───────────────────────────────────────────────────────────

const mockGetUserSettings = jest.fn();

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({ user: { user_id: 'user-1', token: 'test-token-123' } }),
}));

jest.mock('@/lib/ipc/client', () => ({
  useIpcClient: () => ({
    settings: {
      getUserSettings: mockGetUserSettings,
    },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

// ── Tests ───────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetUserSettings.mockReset();
});

describe('useSettings – behavior', () => {
  it('fetches from backend on mount', async () => {
    mockGetUserSettings.mockResolvedValue(DEFAULT_USER_SETTINGS);

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toEqual(DEFAULT_USER_SETTINGS);
    expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
  });

  it('reports error when backend fails', async () => {
    const error = new Error('DB down');
    mockGetUserSettings.mockRejectedValue(error);

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('DB down');
    expect(result.current.settings).toBeNull();
  });

  it('refetch forces a fresh backend call', async () => {
    mockGetUserSettings.mockResolvedValue(DEFAULT_USER_SETTINGS);

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetUserSettings).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(mockGetUserSettings).toHaveBeenCalledTimes(2);
  });
});
