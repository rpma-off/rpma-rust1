import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkflowProgressCard } from '../WorkflowProgressCard';
import { AuthContext } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc/client';
import { useRouter } from 'next/navigation';

// Mock dependencies
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/lib/ipc/client', () => ({
  ipcClient: {
    interventions: {
      start: jest.fn(),
    },
  },
}));

const mockStartIntervention = ipcClient.interventions.start as jest.MockedFunction<typeof ipcClient.interventions.start>;



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

const defaultProps = {
  taskId: 'task-123',
  workflowStatus: 'not_started' as const,
  workflowProgress: {
    percentage: 0,
    currentStep: 0,
    totalSteps: 5,
    completedSteps: 0,
  },
  templateName: 'PPF Workflow',
};

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {component}
    </AuthContext.Provider>
  );
};

describe('WorkflowProgressCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with correct initial state for not_started workflow', () => {
      renderWithAuth(<WorkflowProgressCard {...defaultProps} />);

      expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
      expect(screen.getByText('Not Started')).toBeInTheDocument();
      expect(screen.getByText('Commencer le workflow')).toBeInTheDocument();
      expect(screen.getByText('Template: PPF Workflow')).toBeInTheDocument();
    });

    it('renders with correct state for in_progress workflow', () => {
      const props = {
        ...defaultProps,
        workflowStatus: 'in_progress' as const,
        workflowProgress: {
          percentage: 40,
          currentStep: 2,
          totalSteps: 5,
          completedSteps: 2,
        },
      };

      renderWithAuth(<WorkflowProgressCard {...props} />);

      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Continuer le workflow')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('2 of 5')).toBeInTheDocument();
    });

    it('renders with correct state for completed workflow', () => {
      const props = {
        ...defaultProps,
        workflowStatus: 'completed' as const,
        workflowProgress: {
          percentage: 100,
          currentStep: 5,
          totalSteps: 5,
          completedSteps: 5,
        },
      };

      renderWithAuth(<WorkflowProgressCard {...props} />);

      // Check for the status badge specifically (should be in a badge element)
      const statusBadges = screen.getAllByText('Completed');
      const statusBadge = statusBadges.find(badge =>
        badge.closest('[class*="bg-green-100"]')
      );
      expect(statusBadge).toBeInTheDocument();

      expect(screen.getByText('Voir le résumé')).toBeInTheDocument();
    });

    it('does not render when no workflow data is provided', () => {
      const props = {
        taskId: 'task-123',
      };

      const { container } = renderWithAuth(<WorkflowProgressCard {...props} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Button Actions', () => {
    it('calls ipcClient.interventions.start when starting workflow', async () => {
      mockStartIntervention.mockResolvedValue({
        type: 'Started',
        intervention: {
          id: 'intervention-123',
          task_number: null,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'user-123',
          updated_by: null,
          task_id: 'task-123',
          intervention_number: null,
          ppf_zones: [],
          custom_zones: null,
          film_type: 'standard',
          film_brand: null,
          film_model: null,
          weather_condition: null,
          lighting_condition: null,
          work_location: null,
          gps_coordinates: null,
          address: null,
          notes: null,
          customer_requirements: null,
          special_instructions: null,
        },
        steps: [],
      });

      renderWithAuth(<WorkflowProgressCard {...defaultProps} />);

      const button = screen.getByText('Commencer le workflow');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockStartIntervention).toHaveBeenCalledWith(
          {
            task_id: 'task-123',
            intervention_number: null,
            ppf_zones: [],
            custom_zones: null,
            film_type: 'standard',
            film_brand: null,
            film_model: null,
            weather_condition: 'sunny',
            lighting_condition: 'natural',
            work_location: 'outdoor',
            temperature: null,
            humidity: null,
            technician_id: 'user-123',
            assistant_ids: null,
            scheduled_start: expect.any(String),
            estimated_duration: 120,
            gps_coordinates: null,
            address: null,
            notes: null,
            customer_requirements: null,
            special_instructions: null,
          },
          'mock-token'
        );
      });
    });

    it('shows loading state during workflow start', async () => {
      mockStartIntervention.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          type: 'Started',
          intervention: {
            id: 'intervention-123',
            task_number: null,
            status: 'in_progress',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-123',
            updated_by: null,
            task_id: 'task-123',
            intervention_number: null,
            ppf_zones: [],
            custom_zones: null,
            film_type: 'standard',
            film_brand: null,
            film_model: null,
            weather_condition: null,
            lighting_condition: null,
            work_location: null,
            gps_coordinates: null,
            address: null,
            notes: null,
            customer_requirements: null,
            special_instructions: null,
          },
          steps: [],
        }), 100))
      );

      renderWithAuth(<WorkflowProgressCard {...defaultProps} />);

      const button = screen.getByText('Commencer le workflow');
      fireEvent.click(button);

      expect(screen.getByText('Chargement...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Chargement...')).not.toBeInTheDocument();
      });
    });

    it('displays error message on workflow start failure', async () => {
      mockStartIntervention.mockRejectedValue(new Error('Network error'));

      renderWithAuth(<WorkflowProgressCard {...defaultProps} />);

      const button = screen.getByText('Commencer le workflow');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('navigates to workflow page on successful workflow start', async () => {
      mockStartIntervention.mockResolvedValue({
        type: 'Started',
        intervention: {
          id: 'intervention-123',
          task_number: null,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'user-123',
          updated_by: null,
          task_id: 'task-123',
          intervention_number: null,
          ppf_zones: [],
          custom_zones: null,
          film_type: 'standard',
          film_brand: null,
          film_model: null,
          weather_condition: null,
          lighting_condition: null,
          work_location: null,
          gps_coordinates: null,
          address: null,
          notes: null,
          customer_requirements: null,
          special_instructions: null,
        },
        steps: [],
      });

      renderWithAuth(<WorkflowProgressCard {...defaultProps} />);

      const button = screen.getByText('Commencer le workflow');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/tasks/task-123/workflow/ppf');
      });
    });
  });

  describe('Button States', () => {
    it('disables button when not authenticated', () => {
      const authContextWithoutSession = {
        ...mockAuthContext,
        session: null,
      };

      render(
        <AuthContext.Provider value={authContextWithoutSession}>
          <WorkflowProgressCard {...defaultProps} />
        </AuthContext.Provider>
      );

      const button = screen.getByText('Commencer le workflow');
      expect(button).toBeDisabled();
    });

    it('shows correct button text for different workflow states', () => {
      const states = [
        { status: 'not_started', expectedText: 'Commencer le workflow' },
        { status: 'paused', expectedText: 'Reprendre le workflow' },
        { status: 'in_progress', expectedText: 'Continuer le workflow' },
        { status: 'completed', expectedText: 'Voir le résumé' },
      ];

      states.forEach(({ status, expectedText }) => {
        const props = { ...defaultProps, workflowStatus: status as any };
        const { rerender } = renderWithAuth(<WorkflowProgressCard {...props} />);

        expect(screen.getByText(expectedText)).toBeInTheDocument();

        rerender(
          <AuthContext.Provider value={mockAuthContext}>
            <WorkflowProgressCard {...defaultProps} />
          </AuthContext.Provider>
        );
      });
    });
  });
});