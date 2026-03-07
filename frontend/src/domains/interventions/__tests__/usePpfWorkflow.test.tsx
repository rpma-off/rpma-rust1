import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePpfWorkflow } from '../hooks/usePpfWorkflow';
import { ppfWorkflowIpc } from '../ipc/ppfWorkflow.ipc';

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({
    session: { token: 'session-token' },
  }),
}));

jest.mock('../ipc/ppfWorkflow.ipc', () => ({
  ppfWorkflowIpc: {
    saveStepDraft: jest.fn(),
  },
}));

jest.mock('../api/PPFWorkflowProvider', () => ({
  usePPFWorkflow: () => ({
    taskId: 'task-1',
    interventionData: { intervention: { id: 'int-1' } },
    stepsData: {
      steps: [
        {
          id: 'step-1',
          intervention_id: 'int-1',
          step_type: 'inspection',
          step_status: 'in_progress',
        },
      ],
    },
    steps: [
      { id: 'inspection', status: 'in_progress', order: 1 },
      { id: 'preparation', status: 'pending', order: 2 },
      { id: 'installation', status: 'pending', order: 3 },
      { id: 'finalization', status: 'pending', order: 4 },
    ],
    currentStep: { id: 'inspection' },
    task: null,
    isLoading: false,
    error: null,
    canAdvanceToStep: () => true,
    advanceToStep: jest.fn(),
    completeStep: jest.fn(),
    finalizeIntervention: jest.fn(),
  }),
}));

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryWrapper';
  return Wrapper;
};

describe('usePpfWorkflow', () => {
  const mockPpfWorkflowIpc = ppfWorkflowIpc as jest.Mocked<typeof ppfWorkflowIpc>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates completed-page intervention query when saving a draft', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    mockPpfWorkflowIpc.saveStepDraft.mockResolvedValue({} as never);

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => usePpfWorkflow(), { wrapper });

    await result.current.saveDraft('inspection', { notes: 'draft' }, { invalidate: true });

    expect(mockPpfWorkflowIpc.saveStepDraft).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['interventions', 'data', 'task-1'] });
  });
});
