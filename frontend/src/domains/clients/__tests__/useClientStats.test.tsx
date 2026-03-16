'use client';

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClientStats } from '../hooks/useClientStats';

const mockGetClientStats = jest.fn();

jest.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ user: { token: 'session-token' } }),
}));

jest.mock('@/shared/hooks/useLogger', () => ({
  useLogger: () => ({
    logInfo: jest.fn(),
    logError: jest.fn(),
  }),
}));

jest.mock('../services', () => ({
  clientService: {
    getClientStats: (...args: unknown[]) => mockGetClientStats(...args),
  },
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
  return Wrapper;
};

describe('useClientStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads client statistics with React Query', async () => {
    mockGetClientStats.mockResolvedValue({
      success: true,
      data: {
        total_clients: 3,
        active_clients: 2,
      },
    });

    const { result } = renderHook(() => useClientStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      total_clients: 3,
      active_clients: 2,
    });
    expect(mockGetClientStats).toHaveBeenCalledTimes(1);
  });

  it('surfaces backend failures', async () => {
    mockGetClientStats.mockResolvedValue({
      success: false,
      error: 'stats unavailable',
    });

    const { result } = renderHook(() => useClientStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.error?.message).toBe('stats unavailable');
  });
});
