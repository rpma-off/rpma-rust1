import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import InspectionStepPage from './page';

jest.useFakeTimers();

const pushMock = jest.fn();
const saveDraftMock = jest.fn().mockResolvedValue(undefined);

let stepRecord: { id: string; collected_data: Record<string, unknown>; photo_urls: string[]; updated_at: string } | null =
  null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/domains/interventions', () => ({
  PpfChecklist: () => <div data-testid="checklist" />,
  PpfDefectsPanel: () => <div data-testid="defects" />,
  PpfPhotoGrid: () => <div data-testid="photos" />,
  PpfStepHero: () => <div data-testid="hero" />,
  PpfWorkflowLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  VehicleDiagram: () => <div data-testid="diagram" />,
  getNextPPFStepId: () => null,
  getPPFStepPath: () => 'steps/inspection',
  usePpfWorkflow: () => ({
    taskId: 'task-1',
    task: null,
    steps: [{ id: 'inspection', title: 'Inspection', status: 'in_progress' }],
    getStepRecord: () => stepRecord,
    saveDraft: saveDraftMock,
    validateStep: jest.fn(),
    intervention: null,
  }),
}));

describe('InspectionStepPage autosave hydration guard', () => {
  beforeEach(() => {
    saveDraftMock.mockClear();
    stepRecord = null;
  });

  it('does not autosave before hydration and saves only after user edit', async () => {
    const { rerender } = render(<InspectionStepPage />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(saveDraftMock).not.toHaveBeenCalled();

    stepRecord = {
      id: 'step-1',
      collected_data: { notes: 'server data' },
      photo_urls: [],
      updated_at: '2026-03-01T10:00:00.000Z',
    };
    rerender(<InspectionStepPage />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(saveDraftMock).not.toHaveBeenCalled();

    const notesInput = screen.getByPlaceholderText(/Observations/i);
    fireEvent.change(notesInput, { target: { value: 'edited note' } });

    await act(async () => {
      jest.advanceTimersByTime(900);
    });

    expect(saveDraftMock).toHaveBeenCalledTimes(1);
  });
});
