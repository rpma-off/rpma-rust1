import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskManager } from '../TaskManager';
import { mockIPC } from '@tauri-apps/api/mocks';

// Mock the IPC calls
const mockGetTasks = jest.fn();
const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();

// Setup IPC mocks
beforeEach(() => {
  mockIPC((cmd, args) => {
    if (cmd === 'get_tasks') {
      return mockGetTasks(args);
    }
    if (cmd === 'create_task') {
      return mockCreateTask(args);
    }
    if (cmd === 'update_task') {
      return mockUpdateTask(args);
    }
    if (cmd === 'delete_task') {
      return mockDeleteTask(args);
    }
  });
});

// Helper to render component with providers
const renderTaskManager = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TaskManager />
    </QueryClientProvider>
  );
};

describe('TaskManager Error Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays error message when tasks fail to load', async () => {
    // Mock error response
    mockGetTasks.mockRejectedValue(new Error('Network error'));

    renderTaskManager();

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for empty task title', async () => {
    // Mock initial data
    mockGetTasks.mockResolvedValue({
      success: true,
      data: [],
    });

    // Mock failed creation due to validation
    mockCreateTask.mockResolvedValue({
      success: false,
      error: 'Task title is required',
    });

    renderTaskManager();

    // Click create task button
    const createButton = screen.getByRole('button', { name: /create task/i });
    fireEvent.click(createButton);

    // Try to save without title
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText(/task title is required/i)).toBeInTheDocument();
    });
  });

  test('handles invalid status transition error', async () => {
    // Mock initial data with existing task
    mockGetTasks.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'task-1',
          title: 'Existing Task',
          status: 'Completed',
          // ... other fields
        },
      ],
    });

    // Mock failed update due to invalid status transition
    mockUpdateTask.mockResolvedValue({
      success: false,
      error: 'Invalid status transition: Cannot update completed task',
    });

    renderTaskManager();

    await waitFor(() => {
      expect(screen.getByText('Existing Task')).toBeInTheDocument();
    });

    // Try to edit completed task
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Try to change status
    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: 'In Progress' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText(/invalid status transition/i)).toBeInTheDocument();
    });
  });

  test('displays error when task deletion fails due to constraints', async () => {
    mockGetTasks.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'task-1',
          title: 'Task with Dependencies',
          status: 'In Progress',
          has_dependencies: true,
        },
      ],
    });

    // Mock deletion failure
    mockDeleteTask.mockResolvedValue({
      success: false,
      error: 'Cannot delete task: Has dependent interventions',
    });

    renderTaskManager();

    await waitFor(() => {
      expect(screen.getByText('Task with Dependencies')).toBeInTheDocument();
    });

    // Try to delete task
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText(/cannot delete task: has dependent interventions/i)).toBeInTheDocument();
    });
  });

  test('shows error for invalid date format', async () => {
    mockGetTasks.mockResolvedValue({
      success: true,
      data: [],
    });

    renderTaskManager();

    // Click create task
    const createButton = screen.getByRole('button', { name: /create task/i });
    fireEvent.click(createButton);

    // Try to set invalid date
    const dateInput = screen.getByLabelText(/scheduled date/i);
    fireEvent.change(dateInput, { target: { value: '2024-13-45' } }); // Invalid date

    // Check for date validation error
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid date/i)).toBeInTheDocument();
    });
  });

  test('handles unauthorized access error', async () => {
    // Mock unauthorized error
    mockGetTasks.mockResolvedValue({
      success: false,
      error: 'Unauthorized: Invalid session token',
    });

    renderTaskManager();

    // Check for unauthorized message
    await waitFor(() => {
      expect(screen.getByText(/unauthorized: invalid session token/i)).toBeInTheDocument();
    });

    // Should show login prompt
    expect(screen.getByText(/please log in to access tasks/i)).toBeInTheDocument();
  });

  test('displays error for duplicate task number', async () => {
    mockGetTasks.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'task-1',
          task_number: 'TSK-2024-001',
          title: 'Existing Task',
        },
      ],
    });

    // Mock creation failure for duplicate
    mockCreateTask.mockResolvedValue({
      success: false,
      error: 'Task number TSK-2024-001 already exists',
    });

    renderTaskManager();

    // Create new task with custom number
    const createButton = screen.getByRole('button', { name: /create task/i });
    fireEvent.click(createButton);

    // Fill form
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'New Task' } });

    const taskNumberInput = screen.getByLabelText(/task number/i);
    fireEvent.change(taskNumberInput, { target: { value: 'TSK-2024-001' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Check for duplicate error
    await waitFor(() => {
      expect(screen.getByText(/task number tsk-2024-001 already exists/i)).toBeInTheDocument();
    });
  });

  test('handles server timeout error', async () => {
    // Mock timeout
    mockGetTasks.mockRejectedValue(new Error('Request timeout after 30 seconds'));

    renderTaskManager();

    // Check for timeout message
    await waitFor(() => {
      expect(screen.getByText(/request timed out/i)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});