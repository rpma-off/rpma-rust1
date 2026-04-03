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
    customer_satisfaction: 5,
    quality_score: 92,
    customer_signature: {
      svg_data: 'data:image/png;base64,signature',
      signatory: 'Client Test',
      customer_comments: 'RAS',
    },
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
  PPF_STEP_CONFIG: {
    inspection: { label: 'Inspection', description: '', duration: '~12 min', icon: () => null },
    preparation: { label: 'Preparation', description: '', duration: '~18 min', icon: () => null },
    installation: { label: 'Installation', description: '', duration: '~45 min', icon: () => null },
    finalization: { label: 'Finalisation', description: '', duration: '~8 min', icon: () => null },
  },
  buildStepExportPayload: jest.fn(),
  downloadJsonFile: jest.fn(),
  getEffectiveStepData: (step: { collected_data?: Record<string, unknown> | null }) => step.collected_data ?? {},
  getPPFStepPath: () => 'workflow/ppf',
  usePpfWorkflow: () => ({
    taskId: 'task-1',
    steps: [
      { id: 'inspection', title: 'Inspection', status: 'completed' },
      { id: 'preparation', title: 'Preparation', status: 'completed' },
      { id: 'installation', title: 'Installation', status: 'completed' },
      { id: 'finalization', title: 'Finalisation', status: 'in_progress' },
    ],
    stepsData: {
      steps: [
        { id: '1', step_type: 'inspection', step_status: 'completed', completed_at: '2026-03-10T08:00:00.000Z', photo_urls: [], collected_data: {} },
        { id: '2', step_type: 'preparation', step_status: 'completed', completed_at: '2026-03-10T08:30:00.000Z', photo_urls: [], collected_data: {} },
        { id: '3', step_type: 'installation', step_status: 'completed', completed_at: '2026-03-10T09:30:00.000Z', photo_urls: [], collected_data: { zones: [] } },
        { id: '4', step_type: 'finalization', step_status: 'in_progress', completed_at: null, photo_urls: ['photo-1', 'photo-2', 'photo-3'], collected_data: stepRecordMock.collected_data },
      ],
    },
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

    expect(screen.getByText(/Finaliser l intervention/i)).toBeInTheDocument();
    expect(screen.getByText(/Cette action est irreversible/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Finaliser l intervention/i)).not.toBeInTheDocument();
    });
    expect(validateStepMock).not.toHaveBeenCalled();
  });

  it('runs finalization only after confirm', async () => {
    render(<FinalizationStepPage />);

    fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }));

    await waitFor(() => {
      expect(validateStepMock).toHaveBeenCalledWith(
        'finalization',
        {
          checklist: completeChecklist,
          notes: 'Done',
          customer_satisfaction: 5,
          quality_score: 92,
          customer_signature: {
            svg_data: 'data:image/png;base64,signature',
            signatory: 'Client Test',
            customer_comments: 'RAS',
          },
        },
        ['photo-1', 'photo-2', 'photo-3']
      );
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/tasks/task-1/completed');
    });
  });
});
