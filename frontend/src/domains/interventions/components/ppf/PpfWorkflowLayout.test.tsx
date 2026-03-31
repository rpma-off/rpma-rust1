import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { PpfWorkflowLayout } from './PpfWorkflowLayout';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const toastErrorMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('../../hooks/usePpfWorkflow', () => ({
  usePpfWorkflow: () => ({
    taskId: 'task-1',
    task: null,
    intervention: { temperature_celsius: null, humidity_percentage: null },
    steps: [
      { id: 'inspection', title: 'Inspection', status: 'completed', order: 1 },
      { id: 'preparation', title: 'Preparation', status: 'in_progress', order: 2 },
    ],
    stepsData: { steps: [{ id: 'step-1' }, { id: 'step-2' }] },
    currentStep: { id: 'preparation' },
    allowedStepId: 'preparation',
    canAccessStep: () => true,
    isLoading: false,
    error: null,
  }),
}));

jest.mock('./PpfHeaderBand', () => ({
  PpfHeaderBand: () => <div data-testid="header-band" />,
}));

jest.mock('./PpfStepperBand', () => ({
  PpfStepperBand: ({ onStepClick }: { onStepClick: (stepId: 'inspection') => void }) => (
    <button onClick={() => onStepClick('inspection')}>Go step</button>
  ),
}));

describe('PpfWorkflowLayout draft navigation guard', () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    toastErrorMock.mockClear();
    (toast.error as jest.Mock).mockImplementation(toastErrorMock);
  });

  it('flushes the draft before navigating with the stepper', async () => {
    const saveNow = jest.fn().mockResolvedValue(true);

    render(
      <PpfWorkflowLayout
        stepId="preparation"
        draftGuard={{ hasPendingDraft: true, saveNow }}
      >
        <div>content</div>
      </PpfWorkflowLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go step' }));

    await waitFor(() => {
      expect(saveNow).toHaveBeenCalledTimes(1);
    });
    expect(pushMock).toHaveBeenCalledWith('/tasks/task-1/workflow/ppf/steps/inspection');
  });

  it('blocks navigation and shows an error toast when draft save fails', async () => {
    const saveNow = jest.fn().mockRejectedValue(new Error('save failed'));

    render(
      <PpfWorkflowLayout
        stepId="preparation"
        draftGuard={{ hasPendingDraft: true, saveNow }}
      >
        <div>content</div>
      </PpfWorkflowLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go step' }));

    await waitFor(() => {
      expect(saveNow).toHaveBeenCalledTimes(1);
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('save failed');
  });
});
