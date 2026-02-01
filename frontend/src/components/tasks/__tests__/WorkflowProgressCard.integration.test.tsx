import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkflowProgressCard } from '../WorkflowProgressCard';
import { AuthContext } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc/client';

// Mock the entire module
const mockIpcClient = {
  interventions: {
    start: jest.fn(),
    getActiveByTask: jest.fn(),
    getProgress: jest.fn(),
  },
};
jest.mock('@/lib/ipc/client', () => ({
  ipcClient: mockIpcClient,
}));



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

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {component}
    </AuthContext.Provider>
  );
};

describe('WorkflowProgressCard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Workflow Start Integration', () => {
    it('successfully starts workflow and updates UI', async () => {
      mockIpcClient.interventions.start.mockResolvedValue({
        intervention: {
          id: 'intervention-123',
          task_id: 'task-123',
          status: 'in_progress',
          current_step: 1,
          completion_percentage: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        steps: [
          {
            id: 'step-1',
            intervention_id: 'intervention-123',
            step_number: 1,
            step_status: 'pending',
            collected_data: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      renderWithAuth(
        <WorkflowProgressCard
          taskId="task-123"
          workflowStatus="not_started"
          workflowProgress={{
            percentage: 0,
            currentStep: 0,
            totalSteps: 5,
            completedSteps: 0,
          }}
        />
      );

      const button = screen.getByText('Commencer le workflow');
      fireEvent.click(button);

      // Check loading state
      expect(screen.getByText('Chargement...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(mockIpcClient.interventions.start).toHaveBeenCalledWith(
          expect.objectContaining({
            task_id: 'task-123',
            technician_id: 'user-123',
            film_type: 'standard',
          }),
          'mock-token'
        );
      });

      // Verify page reload was triggered
      expect(mockReload).toHaveBeenCalled();
    });

    it('handles workflow start errors gracefully', async () => {
      const errorMessage = 'Failed to create intervention';
      mockIpcClient.interventions.start.mockRejectedValue(new Error(errorMessage));

      renderWithAuth(
        <WorkflowProgressCard
          taskId="task-123"
          workflowStatus="not_started"
          workflowProgress={{
            percentage: 0,
            currentStep: 0,
            totalSteps: 5,
            completedSteps: 0,
          }}
        />
      );

      const button = screen.getByText('Commencer le workflow');
      fireEvent.click(button);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Button should be re-enabled
      expect(screen.getByText('Commencer le workflow')).toBeInTheDocument();
    });

    it('validates required session token', async () => {
      const authContextWithoutSession = {
        ...mockAuthContext,
        session: null,
      };

      render(
        <AuthContext.Provider value={authContextWithoutSession}>
          <WorkflowProgressCard
            taskId="task-123"
            workflowStatus="not_started"
            workflowProgress={{
              percentage: 0,
              currentStep: 0,
              totalSteps: 5,
              completedSteps: 0,
            }}
          />
        </AuthContext.Provider>
      );

      const button = screen.getByText('Commencer le workflow');
      expect(button).toBeDisabled();

      // Clicking disabled button should not call IPC
      fireEvent.click(button);
      expect(mockIpcClient.interventions.start).not.toHaveBeenCalled();
    });
  });

  describe('Progress Display Integration', () => {
    it('displays progress information correctly', () => {
      renderWithAuth(
        <WorkflowProgressCard
          taskId="task-123"
          workflowStatus="in_progress"
          workflowProgress={{
            percentage: 60,
            currentStep: 3,
            totalSteps: 5,
            completedSteps: 3,
          }}
        />
      );

      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('3 of 5')).toBeInTheDocument();
      expect(screen.getByText('3 steps')).toBeInTheDocument();
    });

    it('shows correct status badge colors', () => {
      const { rerender } = renderWithAuth(
        <WorkflowProgressCard
          taskId="task-123"
          workflowStatus="not_started"
          workflowProgress={{
            percentage: 0,
            currentStep: 0,
            totalSteps: 5,
            completedSteps: 0,
          }}
        />
      );

      expect(screen.getByText('Not Started')).toBeInTheDocument();

      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <WorkflowProgressCard
            taskId="task-123"
            workflowStatus="in_progress"
            workflowProgress={{
              percentage: 40,
              currentStep: 2,
              totalSteps: 5,
              completedSteps: 2,
            }}
          />
        </AuthContext.Provider>
      );

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });

  describe('Button State Transitions', () => {
    it('transitions through different workflow states correctly', () => {
      const states = [
        { status: 'not_started', buttonText: 'Commencer le workflow' },
        { status: 'in_progress', buttonText: 'Continuer le workflow' },
        { status: 'paused', buttonText: 'Reprendre le workflow' },
        { status: 'completed', buttonText: 'Voir le résumé' },
      ];

      states.forEach(({ status, buttonText }) => {
        const { rerender } = renderWithAuth(
          <WorkflowProgressCard
            taskId="task-123"
            workflowStatus={status as any}
            workflowProgress={{
              percentage: 0,
              currentStep: 0,
              totalSteps: 5,
              completedSteps: 0,
            }}
          />
        );

        expect(screen.getByText(buttonText)).toBeInTheDocument();

        rerender(
          <AuthContext.Provider value={mockAuthContext}>
            <WorkflowProgressCard
              taskId="task-123"
              workflowStatus="not_started"
              workflowProgress={{
                percentage: 0,
                currentStep: 0,
                totalSteps: 5,
                completedSteps: 0,
              }}
            />
          </AuthContext.Provider>
        );
      });
    });
  });
});