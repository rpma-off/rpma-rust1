import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PPFStepProgress } from '../PPFStepProgress';
import { usePPFWorkflow } from '@/contexts/PPFWorkflowContext';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/contexts/PPFWorkflowContext', () => ({
  usePPFWorkflow: jest.fn(),
}));

const mockUsePPFWorkflow = usePPFWorkflow as jest.MockedFunction<typeof usePPFWorkflow>;

describe('PPFStepProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePPFWorkflow.mockReturnValue({
      taskId: 'task-42',
      steps: [
        { id: 'inspection', title: 'Inspection', status: 'completed', order: 1, description: '' },
        { id: 'preparation', title: 'Préparation', status: 'pending', order: 2, description: '' },
        { id: 'installation', title: 'Installation', status: 'pending', order: 3, description: '' },
        { id: 'finalization', title: 'Finalisation', status: 'pending', order: 4, description: '' },
      ],
      currentStep: { id: 'preparation', title: 'Préparation', status: 'pending', order: 2, description: '' },
      canAdvanceToStep: (stepId: string) => stepId === 'inspection' || stepId === 'preparation' || stepId === 'installation',
    } as never);
  });

  it('navigates when an accessible step is clicked', () => {
    render(<PPFStepProgress />);

    fireEvent.click(screen.getByLabelText("Aller à l'étape 3: Installation"));

    expect(mockPush).toHaveBeenCalledWith('/tasks/task-42/workflow/ppf/steps/installation');
  });

  it('does not navigate when a locked step is clicked', () => {
    render(<PPFStepProgress />);

    fireEvent.click(screen.getByLabelText("Aller à l'étape 4: Finalisation"));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation for accessible steps', () => {
    render(<PPFStepProgress />);

    fireEvent.keyDown(screen.getByLabelText("Aller à l'étape 2: Préparation"), { key: 'Enter' });

    expect(mockPush).toHaveBeenCalledWith('/tasks/task-42/workflow/ppf/steps/preparation');
  });

  it('supports space key activation for accessible steps', () => {
    render(<PPFStepProgress />);

    fireEvent.keyDown(screen.getByLabelText("Aller à l'étape 2: Préparation"), { key: ' ' });
    fireEvent.keyUp(screen.getByLabelText("Aller à l'étape 2: Préparation"), { key: ' ' });

    expect(mockPush).toHaveBeenCalledWith('/tasks/task-42/workflow/ppf/steps/preparation');
  });
});
