import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TaskWithDetails } from '@/types/task.types';
import { useTasks } from '../hooks/useTasks';
import { taskIpc } from '../ipc/task.ipc';

// Create a new QueryClient instance for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({
    user: { token: 'mock-token-123' },
  }),
}));

// Use absolute path for mocking to avoid import mismatch
jest.mock('@/domains/tasks/ipc/task.ipc', () => ({
  taskIpc: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockTask: TaskWithDetails = {
  id: 'task-1',
  task_number: 'T001',
  title: 'Test Task',
  status: 'pending',
  priority: 'medium',
} as TaskWithDetails;

const mockTask2: TaskWithDetails = {
  ...mockTask,
  id: 'task-2',
  task_number: 'T002',
  title: 'Test Task 2',
} as TaskWithDetails;

const mockApiResponse = {
  data: [mockTask, mockTask2],
  pagination: {
    page: 1,
    total: 2,
    total_pages: 1,
    limit: 10,
    has_next: false,
    has_prev: false,
  },
};

describe('useTasks (Integration)', () => {
  const mockTaskIpc = taskIpc as jest.Mocked<typeof taskIpc>;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockTaskIpc.list.mockResolvedValue(mockApiResponse as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('loads tasks on mount with default options', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual([mockTask, mockTask2]);
    expect(result.current.pagination).toEqual({
      page: 1,
      total: 2,
      totalPages: 1,
      limit: 10,
    });
    expect(result.current.error).toBeNull();
  });

  it('handles undefined data.data gracefully', async () => {
    const responseWithUndefinedData = {
      data: undefined,
      pagination: {
        page: 1,
        total: 0,
        total_pages: 1,
        limit: 10,
        has_next: false,
        has_prev: false,
      },
    };

    mockTaskIpc.list.mockResolvedValue(responseWithUndefinedData as any);

    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
