import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInterventionReportPreview } from '../useInterventionReportPreview';

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({ session: { token: 'test-token' } }),
}));

jest.mock('@/domains/interventions/api', () => ({
  interventionsIpc: {
    get: jest.fn(),
    getProgress: jest.fn(),
  },
}));

jest.mock('../../ipc/reports.ipc', () => ({
  reportsIpc: {
    getByIntervention: jest.fn(),
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  Wrapper.displayName = 'QueryWrapper';
  return Wrapper;
};

const mockIntervention = {
  id: 'inter-1',
  task_id: 'task-1',
  task_number: 'TSK-001',
  status: 'completed',
  vehicle_plate: 'AB-123-CD',
  vehicle_model: 'Clio',
  vehicle_make: 'Renault',
  vehicle_year: 2022,
  vehicle_color: 'Bleu',
  vehicle_vin: null,
  client_id: 'client-1',
  client_name: 'Jean Dupont',
  client_email: 'jean@example.com',
  client_phone: '+33600000000',
  technician_id: 'tech-1',
  technician_name: 'Marie Martin',
  intervention_type: 'ppf',
  current_step: 4,
  completion_percentage: 100,
  ppf_zones_config: null,
  ppf_zones_extended: null,
  film_type: null,
  film_brand: null,
  film_model: null,
  scheduled_at: null,
  started_at: null,
  completed_at: null,
  paused_at: null,
  estimated_duration: null,
  actual_duration: null,
  weather_condition: null,
  lighting_condition: null,
  work_location: null,
  temperature_celsius: null,
  humidity_percentage: null,
  start_location_lat: null,
  start_location_lon: null,
  start_location_accuracy: null,
  end_location_lat: null,
  end_location_lon: null,
  end_location_accuracy: null,
  customer_satisfaction: null,
  quality_score: null,
  final_observations: null,
  customer_signature: null,
  customer_comments: null,
  metadata: null,
  notes: null,
  special_instructions: null,
  device_info: null,
  app_version: null,
  synced: true,
  last_synced_at: null,
  sync_error: null,
  created_at: BigInt(1704844800000),
  updated_at: BigInt(1704844800000),
  created_by: null,
  updated_by: null,
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { interventionsIpc } = require('@/domains/interventions/api') as {
  interventionsIpc: {
    get: jest.Mock;
    getProgress: jest.Mock;
  };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { reportsIpc } = require('../../ipc/reports.ipc') as {
  reportsIpc: { getByIntervention: jest.Mock };
};

describe('useInterventionReportPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null viewModel and does not call IPC when interventionId is null', () => {
    const { result } = renderHook(
      () => useInterventionReportPreview({ interventionId: null }),
      { wrapper: createWrapper() },
    );

    expect(result.current.viewModel).toBeNull();
    expect(interventionsIpc.get).not.toHaveBeenCalled();
    expect(interventionsIpc.getProgress).not.toHaveBeenCalled();
    expect(reportsIpc.getByIntervention).not.toHaveBeenCalled();
  });

  it('returns isLoading true before queries resolve', () => {
    interventionsIpc.get.mockResolvedValue(mockIntervention);
    interventionsIpc.getProgress.mockResolvedValue({ steps: [], progress_percentage: 100 });
    reportsIpc.getByIntervention.mockResolvedValue(null);

    const { result } = renderHook(
      () => useInterventionReportPreview({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns viewModel with client name on success', async () => {
    interventionsIpc.get.mockResolvedValue(mockIntervention);
    interventionsIpc.getProgress.mockResolvedValue({ steps: [], progress_percentage: 100 });
    reportsIpc.getByIntervention.mockResolvedValue(null);

    const { result } = renderHook(
      () => useInterventionReportPreview({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.viewModel).not.toBeNull();
    expect(result.current.viewModel!.client.name).toBe('Jean Dupont');
  });

  it('returns viewModel with reportNumber null when report does not exist', async () => {
    interventionsIpc.get.mockResolvedValue(mockIntervention);
    interventionsIpc.getProgress.mockResolvedValue({ steps: [], progress_percentage: 100 });
    reportsIpc.getByIntervention.mockResolvedValue(null);

    const { result } = renderHook(
      () => useInterventionReportPreview({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.viewModel!.meta.reportNumber).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('returns isError true and viewModel null when IPC throws', async () => {
    interventionsIpc.get.mockRejectedValue(new Error('IPC failed'));
    interventionsIpc.getProgress.mockResolvedValue({ steps: [], progress_percentage: 0 });
    reportsIpc.getByIntervention.mockResolvedValue(null);

    const { result } = renderHook(
      () => useInterventionReportPreview({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.viewModel).toBeNull();
  });
});
