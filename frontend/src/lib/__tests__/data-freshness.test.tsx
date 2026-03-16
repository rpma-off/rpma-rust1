import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetMutationCounters, signalMutation, useMutationSignal } from '../data-freshness';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe('useMutationSignal', () => {
  afterEach(() => {
    resetMutationCounters();
  });

  it('invalidates matching query domains when a mutation is signaled', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useMutationSignal(), { wrapper });

    act(() => {
      signalMutation('organization');
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['organization'] });
    });
  });
});
