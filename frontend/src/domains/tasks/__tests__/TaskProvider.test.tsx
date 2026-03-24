import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TaskWithDetails } from '@/types/task.types';
import { TaskProvider, useTaskContext } from '../api/TaskProvider';
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
    user: { token: 'token-123' },
  }),
}));

jest.mock('../ipc/task.ipc', () => ({
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

const TaskConsumer = () => {
  const { tasks, loading } = useTaskContext();
  if (loading) {
    return <div>loading</div>;
  }
  return <div>tasks:{tasks.length}</div>;
};

describe('TaskProvider', () => {
  const mockTaskIpc = taskIpc as jest.Mocked<typeof taskIpc>;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('provides task data to consumers', async () => {
    const mockTask: TaskWithDetails = {
      id: 'task-1',
      task_number: 'T001',
      title: 'Test Task',
      status: 'pending',
      priority: 'medium',
    } as TaskWithDetails;

    mockTaskIpc.list.mockResolvedValue({
      data: [mockTask],
      pagination: {
        page: 1,
        total: 1,
        total_pages: 1,
        limit: 10,
        has_next: false,
        has_prev: false,
      },
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TaskProvider>
          <TaskConsumer />
        </TaskProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('tasks:1')).toBeInTheDocument();
    });
  });
});
