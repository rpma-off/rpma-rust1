import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInterventionData } from '../../hooks/useInterventionData';
import { ipcClient } from '../../lib/ipc';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { token: 'test-token' },
  }),
}));

jest.mock('../../lib/ipc', () => ({
  ipcClient: {
    interventions: {
      getActiveByTask: jest.fn(),
      getLatestByTask: jest.fn(),
      getProgress: jest.fn(),
    },
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
  const mockInterventions = (ipcClient as unknown as {
    interventions: {
      getActiveByTask: jest.Mock;
      getLatestByTask: jest.Mock;
      getProgress: jest.Mock;
    };
  }).interventions;

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
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInterventionData('task-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.steps).toHaveLength(1);
    expect(mockInterventions.getProgress).not.toHaveBeenCalled();
    expect(mockInterventions.getLatestByTask).not.toHaveBeenCalled();
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
    });

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
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInterventionData('task-2'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInterventions.getProgress).toHaveBeenCalledWith('inter-2', 'test-token');
    expect(result.current.data?.steps).toHaveLength(1);
  });
});
