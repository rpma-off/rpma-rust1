import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FinalizationStepPage from './page';

const pushMock = jest.fn();
const validateStepMock = jest.fn().mockResolvedValue(undefined);

const completeChecklist = {
  edges_sealed: true,
  no_bubbles: true,
  smooth_surface: true,
  alignment_ok: true,
  clean_finish: true,
  client_briefed: true,
};

const stepRecordMock = {
  id: 'step-finalization',
  collected_data: {
    checklist: completeChecklist,
    notes: 'Done',
  },
  photo_urls: ['photo-1', 'photo-2', 'photo-3'],
  updated_at: '2026-03-10T00:00:00.000Z',
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/domains/interventions', () => ({
  PpfChecklist: () => <div data-testid="checklist" />,
  PpfPhotoGrid: () => <div data-testid="photos" />,
  PpfStepHero: () => <div data-testid="hero" />,
  PpfWorkflowLayout: ({
    children,
    actionBar,
  }: {
    children: React.ReactNode;
    actionBar?: { onValidate?: () => void; validateDisabled?: boolean };
  }) => (
    <div>
      <button onClick={actionBar?.onValidate} disabled={actionBar?.validateDisabled}>
        Validate
      </button>
      {children}
    </div>
  ),
  getEffectiveStepData: (step: { collected_data?: Record<string, unknown> | null }) => step.collected_data ?? {},
  getNextPPFStepId: () => null,
  getPPFStepPath: () => 'workflow/ppf',
  usePpfWorkflow: () => ({
    taskId: 'task-1',
    steps: [{ id: 'finalization', title: 'Finalisation', status: 'in_progress' }],
    getStepRecord: () => stepRecordMock,
    saveDraft: jest.fn().mockResolvedValue(undefined),
    validateStep: validateStepMock,
    intervention: { id: 'int-1' },
  }),
}));

describe('FinalizationStepPage confirmation dialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a confirmation dialog before finalizing and cancels without action', async () => {
    render(<FinalizationStepPage />);

    fireEvent.click(screen.getByRole('button', { name: /validate/i }));

    expect(screen.getByText("Finaliser l'intervention ?")).toBeInTheDocument();
    expect(screen.getByText(/Cette action est irréversible/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

    await waitFor(() => {
      expect(screen.queryByText("Finaliser l'intervention ?")).not.toBeInTheDocument();
    });
    expect(validateStepMock).not.toHaveBeenCalled();
  });

  it('runs finalization only after confirm', async () => {
    render(<FinalizationStepPage />);

    fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }));

    await waitFor(() => {
      expect(validateStepMock).toHaveBeenCalledWith('finalization', {
        checklist: completeChecklist,
        notes: 'Done',
      }, ['photo-1', 'photo-2', 'photo-3']);
    });
  });
});
