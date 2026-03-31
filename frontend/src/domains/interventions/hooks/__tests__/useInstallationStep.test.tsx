import { act, renderHook } from '@testing-library/react';
import { useInstallationStep } from '../useInstallationStep';

const pushMock = jest.fn();

let currentTaskZones = ['Capot'];
let currentStepRecord: Record<string, unknown> | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/domains/interventions/api/client', () => ({
  usePpfWorkflow: () => ({
    taskId: 'task-1',
    task: { ppf_zones: currentTaskZones },
    steps: [{ id: 'installation', title: 'Installation', status: 'in_progress' }],
    getStepRecord: () => currentStepRecord,
    saveDraft: jest.fn(),
    validateStep: jest.fn(),
    intervention: { id: 'int-1' },
  }),
}));

describe('useInstallationStep', () => {
  beforeEach(() => {
    pushMock.mockClear();
    currentTaskZones = ['Capot'];
    currentStepRecord = {
      id: 'step-installation',
      step_type: 'installation',
      updated_at: '2026-03-30T14:00:00.000Z',
      notes: null,
      collected_data: {
        zones: [{ id: 'capot', name: 'Capot', status: 'pending', checklist: {}, photos: [] }],
        notes: '',
      },
      photo_urls: [],
    };
  });

  it('does not reset local draft when task zones rerender with same server step data', () => {
    const { result, rerender } = renderHook(() => useInstallationStep());

    act(() => {
      result.current.handleToggleChecklist('surface_ready');
      result.current.setNotes('note en cours de saisie');
    });

    expect(result.current.notes).toBe('note en cours de saisie');
    expect(result.current.activeZone?.checklist?.surface_ready).toBe(true);

    currentTaskZones = ['Capot'];
    rerender();

    expect(result.current.notes).toBe('note en cours de saisie');
    expect(result.current.activeZone?.checklist?.surface_ready).toBe(true);
  });
});
