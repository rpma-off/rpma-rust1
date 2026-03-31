import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ipcClient } from '@/lib/ipc/client';
import { WorkflowProgressCard } from '../WorkflowProgressCard';

// Mock dependencies
const mockPush = jest.fn();
const mockUseAuth = jest.fn(() => ({
  session: { id: 'user-123', token: 'mock-token' },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/ipc/client', () => ({
  ipcClient: {
    interventions: {
      start: jest.fn(),
    },
  },
}));

const mockStartIntervention = ipcClient.interventions.start as jest.MockedFunction<typeof ipcClient.interventions.start>;

const createStartedResponse = (): Awaited<ReturnType<typeof ipcClient.interventions.start>> =>
  ({
    type: 'Started',
    intervention: { id: 'intervention-123' },
    steps: [],
  } as unknown as Awaited<ReturnType<typeof ipcClient.interventions.start>>);
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

type WorkflowStatus = NonNullable<React.ComponentProps<typeof WorkflowProgressCard>['workflowStatus']>;

const renderWithAuth = (component: React.ReactElement) => {
  return render(component);
};

describe('WorkflowProgressCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: { id: 'user-123', token: 'mock-token' } });
  });

  describe('Rendering', () => {
    it('renders with correct initial state for not_started workflow', () => {
      renderWithAuth(<WorkflowProgressCard {...defaultProps} />);

      expect(screen.getByText('Progression du workflow')).toBeInTheDocument();
      expect(screen.getByText('Non démarré')).toBeInTheDocument();
      expect(screen.getByText('Commencer le workflow')).toBeInTheDocument();
      expect(screen.getByText('Modèle : PPF Workflow')).toBeInTheDocument();
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

      expect(screen.getByText('En cours')).toBeInTheDocument();
      expect(screen.getByText('Continuer le workflow')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('2 sur 5')).toBeInTheDocument();
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
      const statusBadges = screen.getAllByText('Terminé');
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
      mockStartIntervention.mockResolvedValue(createStartedResponse());

      renderWithAuth(<WorkflowProgressCard {...defaultProps} />);

      const button = screen.getByText('Commencer le workflow');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockStartIntervention).toHaveBeenCalledWith(
          expect.objectContaining({
            task_id: 'task-123',
            technician_id: 'user-123',
          })
        );
      });
    });

    it('shows loading state during workflow start', async () => {
      mockStartIntervention.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createStartedResponse()), 100))
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
      mockStartIntervention.mockResolvedValue(createStartedResponse());

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
      mockUseAuth.mockReturnValue({ session: null });

      render(<WorkflowProgressCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Commencer le workflow' })).toBeDisabled();
    });

    it('shows correct button text for different workflow states', () => {
      const states: Array<{ status: WorkflowStatus; expectedText: string }> = [
        { status: 'not_started', expectedText: 'Commencer le workflow' },
        { status: 'paused', expectedText: 'Reprendre le workflow' },
        { status: 'in_progress', expectedText: 'Continuer le workflow' },
        { status: 'completed', expectedText: 'Voir le résumé' },
      ];

      states.forEach(({ status, expectedText }) => {
        const props = { ...defaultProps, workflowStatus: status };
        const { rerender } = renderWithAuth(<WorkflowProgressCard {...props} />);

        expect(screen.getByText(expectedText)).toBeInTheDocument();

        rerender(<WorkflowProgressCard {...defaultProps} />);
      });
    });
  });
});
