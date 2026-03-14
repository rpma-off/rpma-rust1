import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInterventionData } from '../api/useInterventionData';
import { interventionsIpc } from '../ipc/interventions.ipc';

jest.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { token: 'test-token' },
  }),
}));

jest.mock('../ipc/interventions.ipc', () => ({
  interventionsIpc: {
    getActiveByTask: jest.fn(),
    getLatestByTask: jest.fn(),
    getProgress: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  Wrapper.displayName = 'QueryWrapper';

  return Wrapper;
};

describe('useInterventionData', () => {
  const mockInterventions = interventionsIpc as jest.Mocked<typeof interventionsIpc>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses existing steps when provided by the intervention', async () => {
    const mockIntervention = {
      id: 'inter-1',
      task_id: 'task-1',
      workflow_type: 'ppf',
      status: 'completed',
      current_step: 1,
      progress_percentage: 100,
      started_at: null,
      completed_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      steps: [
        {
          id: 'step-1',
          step_type: 'inspection',
          step_status: 'completed',
          collected_data: {},
          photo_urls: null,
          notes: null,
          completed_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    };

    mockInterventions.getActiveByTask.mockResolvedValue({
      type: 'ActiveByTask',
      intervention: mockIntervention,
    } as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInterventionData('task-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.steps).toHaveLength(1);
    expect(mockInterventions.getProgress).not.toHaveBeenCalled();
    expect(mockInterventions.getLatestByTask).toHaveBeenCalledWith('task-1');
  });

  it('fetches steps when the intervention does not include them', async () => {
    const mockIntervention = {
      id: 'inter-2',
      task_id: 'task-2',
      workflow_type: 'ppf',
      status: 'active',
      current_step: 1,
      progress_percentage: 50,
      started_at: null,
      completed_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockInterventions.getActiveByTask.mockResolvedValue({
      type: 'ActiveRetrieved',
      intervention: mockIntervention,
    } as never);

    mockInterventions.getProgress.mockResolvedValue({
      steps: [
        {
          id: 'step-2',
          step_type: 'inspection',
          step_status: 'in_progress',
          collected_data: {},
          photo_urls: null,
          notes: null,
          completed_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    } as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInterventionData('task-2'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInterventions.getProgress).toHaveBeenCalledWith('inter-2');
    expect(result.current.data?.steps).toHaveLength(1);
  });

  it('accepts direct { intervention } active response shape', async () => {
    mockInterventions.getActiveByTask.mockResolvedValue({
      intervention: {
        id: 'inter-3',
        task_id: 'task-3',
        workflow_type: 'ppf',
        status: 'active',
        current_step: 1,
        progress_percentage: 25,
        started_at: null,
        completed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    } as never);
    mockInterventions.getProgress.mockResolvedValue({ steps: [] } as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInterventionData('task-3'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInterventions.getProgress).toHaveBeenCalledWith('inter-3');
  });

  it('uses step_data as fallback when collected_data is null', async () => {
    mockInterventions.getActiveByTask.mockResolvedValue({
      intervention: {
        id: 'inter-4',
        task_id: 'task-4',
        workflow_type: 'ppf',
        status: 'completed',
        current_step: 4,
        progress_percentage: 100,
        started_at: null,
        completed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    } as never);

    mockInterventions.getProgress.mockResolvedValue({
      steps: [
        {
          id: 'step-4',
          step_type: 'finalization',
          step_status: 'completed',
          collected_data: null,
          step_data: { checklist: { no_bubbles: true } },
          photo_urls: null,
          notes: 'saved on old record',
          completed_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    } as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInterventionData('task-4'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.steps?.[0]?.collected_data).toEqual({ checklist: { no_bubbles: true } });
    expect(result.current.data?.steps?.[0]?.step_data).toEqual({ checklist: { no_bubbles: true } });
  });
});
