import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/contexts/AuthContext';
import { taskService } from '@/lib/services/entities/task.service';
import { TaskDetails } from '../TaskDetails';
import { TaskWithDetails } from '@/types/task.types';
import { format } from 'date-fns';

// Mock dependencies
jest.mock('@/lib/services/entities/task.service', () => ({
  taskService: {
    updateTask: jest.fn(),
  },
}));

jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    deleteTask: jest.fn(),
  }),
}));

jest.mock('@/components/tasks/TaskChecklist', () => ({
  TaskChecklist: ({ taskId }: { taskId: string }) => (
    <div data-testid="task-checklist">Checklist for {taskId}</div>
  ),
}));

jest.mock('@/components/tasks/TaskPhotos', () => ({
  TaskPhotos: ({ taskId }: { taskId: string }) => (
    <div data-testid="task-photos">Photos for {taskId}</div>
  ),
}));

jest.mock('@/components/tasks/TaskHistory', () => ({
  TaskHistory: ({ taskId }: { taskId: string }) => (
    <div data-testid="task-history">History for {taskId}</div>
  ),
}));

const mockUpdateTask = taskService.updateTask as jest.MockedFunction<typeof taskService.updateTask>;

// Mock session data
const mockSession = {
  id: 'user-123',
  user_id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'technician' as const,
  token: 'mock-token',
  refresh_token: null,
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  last_activity: new Date().toISOString(),
  created_at: new Date().toISOString(),
  device_info: null,
  ip_address: null,
  user_agent: null,
  location: null,
  two_factor_verified: false,
  session_timeout_minutes: null,
};

const mockAuthContext = {
  user: mockSession,
  profile: null,
  session: mockSession,
  loading: false,
  isAuthenticating: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
};

// Mock task data
const mockTask: TaskWithDetails = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'draft',
  priority: 'high',
  client_id: 'client-1',
  vehicle_make: 'Toyota',
  vehicle_model: 'Camry',
  vehicle_plate: 'ABC123',
  ppf_zones: ['hood', 'bumper'],
  technician_id: null,
  technician: null,
  scheduled_date: '2024-01-15T10:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  creator_id: 'user-123',
  checklist_completed: false,
  notes: null,
  vehicle_year: null,
  vin: null,
  date_rdv: null,
  heure_rdv: null,
  lot_film: null,
  customer_name: null,
  customer_email: null,
  customer_phone: null,
  customer_address: null,
  custom_ppf_zones: null,
  template_id: null,
  workflow_id: null,
  task_number: null,
  start_time: null,
  end_time: null,
  estimated_duration: null,
  tags: null,
  external_id: null,
  client: {
    id: 'client-1',
    name: 'Test Client',
    email: 'client@test.com',
  },
  interventions: [],
  photos: [],
  checklist_items: [],
};

// Test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  Wrapper.displayName = 'TaskDetailsTestWrapper';

  return Wrapper;
};

describe('TaskDetails', () => {
  const mockOnTaskUpdated = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateTask.mockResolvedValue({} as any);
  });

  describe('Rendering', () => {
    it('renders task details correctly when task is provided', () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('#task-1')).toBeInTheDocument();
      expect(screen.getByText('hood, bumper')).toBeInTheDocument();
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
      const expectedDate = format(new Date(mockTask.scheduled_date), 'PPp');
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });

    it('displays technician name when assigned', () => {
      const taskWithTechnician = {
        ...mockTask,
        technician_id: 'tech-1',
        technician: {
          id: 'tech-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
      };

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={taskWithTechnician} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders correct action buttons based on task status', () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      // For draft status
      expect(screen.getByText('Assign to Me')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Start Task')).toBeInTheDocument();
    });

    it('renders different buttons for in_progress status', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' as const };
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={inProgressTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      expect(screen.getByText('Assign to Me')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Mark as Invalid')).toBeInTheDocument();
      expect(screen.getByText('Complete Task')).toBeInTheDocument();
    });

    it('renders tabs correctly', () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      expect(screen.getByText('Checklist')).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByTestId('task-checklist')).toBeInTheDocument();
      expect(screen.getByText('Checklist for task-1')).toBeInTheDocument();
    });

    it('does not render when task is null', () => {
      const Wrapper = createTestWrapper();
      
      const { container } = render(
        <Wrapper>
          <TaskDetails 
            task={null} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      const Wrapper = createTestWrapper();
      const user = userEvent.setup();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      // Initially on checklist tab
      expect(screen.getByTestId('task-checklist')).toBeInTheDocument();
      expect(screen.queryByTestId('task-photos')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-history')).not.toBeInTheDocument();

      // Switch to photos tab
      await user.click(screen.getByRole('tab', { name: 'Photos' }));
      expect(await screen.findByTestId('task-photos')).toBeInTheDocument();
      expect(screen.getByText('Photos for task-1')).toBeInTheDocument();

      // Switch to history tab
      await user.click(screen.getByRole('tab', { name: 'History' }));
      expect(await screen.findByTestId('task-history')).toBeInTheDocument();
      expect(screen.getByText('History for task-1')).toBeInTheDocument();
    });
  });

  describe('Task Assignment', () => {
    it('assigns task to current user when clicking Assign to Me', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByText('Assign to Me'));

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          'task-1',
          expect.objectContaining({
            technician_id: 'user-123',
          })
        );
      });
    });
  });

  describe('Task Status Updates', () => {
    it('starts task when clicking Start Task button', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByText('Start Task'));

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          'task-1',
          expect.objectContaining({
            status: 'in_progress',
          })
        );
      });
    });

    it('completes task when clicking Complete Task button', async () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' as const };
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={inProgressTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByText('Complete Task'));

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          'task-1',
          expect.objectContaining({
            status: 'completed',
          })
        );
      });
    });

    it('marks task as invalid when clicking Mark as Invalid button', async () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' as const };
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={inProgressTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByText('Mark as Invalid'));

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(
          'task-1',
          expect.objectContaining({
            status: 'cancelled',
          })
        );
      });
    });
  });

  describe('Task Deletion', () => {
    it('opens confirmation dialog when clicking Delete button', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByText('Are you sure you want to delete this task?')).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Delete Task')).toBeInTheDocument();
    });

    it('closes dialog when canceling deletion', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByText('Delete'));
      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Are you sure you want to delete this task?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Behavior', () => {
    it('calls onOpenChange when dialog is closed', () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      // Press Escape key
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onTaskUpdated after successful mutations', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <TaskDetails 
            task={mockTask} 
            open={true} 
            onOpenChange={mockOnOpenChange}
            onTaskUpdated={mockOnTaskUpdated}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByText('Assign to Me'));

      await waitFor(() => {
        expect(mockOnTaskUpdated).toHaveBeenCalled();
      });
    });
  });
});
