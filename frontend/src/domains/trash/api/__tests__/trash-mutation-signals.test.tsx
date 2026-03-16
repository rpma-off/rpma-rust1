import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEmptyTrash, useRestoreEntity } from '..';

const mockRestore = jest.fn();
const mockEmptyTrash = jest.fn();
const mockSignalMutation = jest.fn();

jest.mock('@/lib/data-freshness', () => ({
  signalMutation: (domain: string) => mockSignalMutation(domain),
}));

jest.mock('../../ipc', () => ({
  trashIpc: {
    restore: (...args: unknown[]) => mockRestore(...args),
    emptyTrash: (...args: unknown[]) => mockEmptyTrash(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('trash mutation signaling', () => {
  beforeEach(() => {
    mockRestore.mockReset();
    mockEmptyTrash.mockReset();
    mockSignalMutation.mockReset();
  });

  it('signals the restored entity domain', async () => {
    mockRestore.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRestoreEntity(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ entityType: 'Task', id: 'task-1' });
    });

    expect(mockSignalMutation).toHaveBeenCalledWith('tasks');
  });

  it('signals every affected domain when emptying all trash', async () => {
    mockEmptyTrash.mockResolvedValue(5);

    const { result } = renderHook(() => useEmptyTrash(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(mockSignalMutation.mock.calls.map(([domain]) => domain)).toEqual([
      'tasks',
      'clients',
      'quotes',
      'inventory',
      'interventions',
      'reports',
    ]);
  });
});
