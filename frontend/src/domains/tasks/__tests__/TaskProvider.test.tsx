import { render, screen, waitFor } from '@testing-library/react';
import { TaskProvider, useTaskContext } from '../api/TaskProvider';
import { taskService } from '../services/task.service';
import type { TaskWithDetails } from '@/types/task.types';

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({
    user: { token: 'token-123' },
  }),
}));

jest.mock('../services/task.service', () => ({
  taskService: {
    getTasks: jest.fn(),
  },
  TaskService: {
    getInstance: () => ({
      getTaskById: jest.fn(),
      updateTask: jest.fn(),
    }),
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
  const mockTaskService = taskService as jest.Mocked<typeof taskService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides task data to consumers', async () => {
    const mockTask: TaskWithDetails = {
      id: 'task-1',
      task_number: 'T001',
      title: 'Test Task',
      status: 'pending',
      priority: 'medium',
    } as TaskWithDetails;

    mockTaskService.getTasks.mockResolvedValue({
      success: true,
      data: {
        data: [mockTask],
        pagination: {
          page: 1,
          total: 1,
          total_pages: 1,
          limit: 10,
        },
      },
      status: 200,
    } as Awaited<ReturnType<typeof mockTaskService.getTasks>>);

    render(
      <TaskProvider>
        <TaskConsumer />
      </TaskProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('tasks:1')).toBeInTheDocument();
    });
  });
});
