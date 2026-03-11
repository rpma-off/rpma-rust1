import React from 'react';
import { render, screen } from '@testing-library/react';
import PPFWorkflowPage from './page';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/domains/interventions', () => {
  const MockIcon = () => <svg data-testid="mock-icon" />;
  return {
    PPF_STEP_CONFIG: {
      inspection: { label: 'Inspection', description: 'Inspecter', duration: '10 min', icon: MockIcon },
      preparation: { label: 'Préparation', description: 'Préparer', duration: '15 min', icon: MockIcon },
      installation: { label: 'Installation', description: 'Installer', duration: '25 min', icon: MockIcon },
      finalization: { label: 'Finalisation', description: 'Finaliser', duration: '8 min', icon: MockIcon },
    },
    PpfWorkflowLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    getPPFStepPath: (step: string) => step,
    usePpfWorkflow: () => ({
      taskId: 'task-1',
      task: null,
      intervention: null,
      currentStep: { id: 'inspection' },
      canAccessStep: (stepId: string) => stepId === 'inspection',
      steps: [
        { id: 'inspection', title: 'Inspection', description: '', status: 'in_progress', order: 1 },
        { id: 'preparation', title: 'Préparation', description: '', status: 'pending', order: 2 },
        { id: 'installation', title: 'Installation', description: '', status: 'pending', order: 3 },
        { id: 'finalization', title: 'Finalisation', description: '', status: 'pending', order: 4 },
      ],
    }),
  };
});

describe('PPFWorkflowPage', () => {
  it('shows progression and lock reason for blocked steps', () => {
    render(<PPFWorkflowPage />);

    expect(screen.getByText('Progression globale')).toBeInTheDocument();
    expect(screen.getByText('0 / 4 étapes')).toBeInTheDocument();

    expect(
      screen.getByText("Complétez d'abord « Inspection » pour déverrouiller cette étape.")
    ).toBeInTheDocument();

    const lockedLabels = screen.getAllByText('Verrouillé');
    expect(lockedLabels.length).toBeGreaterThan(0);
    expect(lockedLabels[0].closest('button')).toBeDisabled();
  });
});
