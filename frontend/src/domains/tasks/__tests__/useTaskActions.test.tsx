import { renderHook, act } from '@testing-library/react';
import { useTaskActions } from '../api/useTaskActions';
import { taskService } from '../services/task.service';

jest.mock('../services/task.service', () => ({
  taskService: {
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useTaskActions', () => {
  const mockTaskService = taskService as jest.Mocked<typeof taskService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a task when authenticated', async () => {
    mockTaskService.createTask.mockResolvedValue({
      success: true,
      data: { id: 'task-1' },
    } as Awaited<ReturnType<typeof mockTaskService.createTask>>);

    const onTaskAdd = jest.fn();
    const { result } = renderHook(() => useTaskActions({ userToken: 'token-123', onTaskAdd }));

    let createdTask: unknown;
    await act(async () => {
      createdTask = await result.current.createTask({ title: 'New task' });
    });

    expect(mockTaskService.createTask).toHaveBeenCalled();
    expect(onTaskAdd).toHaveBeenCalled();
    expect(createdTask).toEqual({ id: 'task-1' });
  });

  it('throws when creating without a token', async () => {
    const { result } = renderHook(() => useTaskActions());

    await expect(result.current.createTask({ title: 'No auth' })).rejects.toThrow('Authentication required');
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });
});
