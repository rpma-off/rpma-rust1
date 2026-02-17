import { renderHook, waitFor } from '@testing-library/react';
import { useTasks } from '../api/useTasks';
import { taskService } from '../services/task.service';
import type { TaskWithDetails } from '@/types/task.types';

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({
    user: { token: 'mock-token-123' },
  }),
}));

jest.mock('../services/task.service', () => ({
  taskService: {
    getTasks: jest.fn(),
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
  success: true,
  data: {
    data: [mockTask, mockTask2],
    pagination: {
      page: 1,
      total: 2,
      total_pages: 1,
      limit: 10,
    },
  },
  status: 200,
};

describe('useTasks (Integration)', () => {
  const mockTaskService = taskService as jest.Mocked<typeof taskService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskService.getTasks.mockResolvedValue(mockApiResponse as Awaited<ReturnType<typeof mockTaskService.getTasks>>);
  });

  it('loads tasks on mount with default options', async () => {
    const { result } = renderHook(() => useTasks());

    expect(result.current.loading).toBe(true);
    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();

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
      success: true,
      data: {
        data: undefined,
        pagination: {
          page: 1,
          total: 0,
          total_pages: 1,
          limit: 10,
        },
      },
      status: 200,
    };

    mockTaskService.getTasks.mockResolvedValue(responseWithUndefinedData as Awaited<ReturnType<typeof mockTaskService.getTasks>>);

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
