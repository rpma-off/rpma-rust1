import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInterventionReport } from '../useInterventionReport';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../ipc/reports.ipc', () => ({
  reportsIpc: {
    getByIntervention: jest.fn(),
    generate: jest.fn(),
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

const mockReport = {
  id: 'report-1',
  intervention_id: 'inter-1',
  report_number: 'INT-2024-0001',
  generated_at: '2024-01-10T15:00:00Z',
  technician_id: null,
  technician_name: null,
  file_path: null,
  file_name: null,
  file_size: null,
  format: 'pdf',
  status: 'generated',
  created_at: 1704844800000,
  updated_at: 1704844800000,
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { reportsIpc } = require('../../ipc/reports.ipc') as {
  reportsIpc: {
    getByIntervention: jest.Mock;
    generate: jest.Mock;
  };
};

describe('useInterventionReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch when interventionId is null', () => {
    renderHook(() => useInterventionReport({ interventionId: null }), {
      wrapper: createWrapper(),
    });

    expect(reportsIpc.getByIntervention).not.toHaveBeenCalled();
  });

  it('is in loading state before query resolves', () => {
    reportsIpc.getByIntervention.mockResolvedValue(null);

    const { result } = renderHook(
      () => useInterventionReport({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.loading).toBe(true);
  });

  it('returns report on successful fetch', async () => {
    reportsIpc.getByIntervention.mockResolvedValue(mockReport);

    const { result } = renderHook(
      () => useInterventionReport({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.report).toEqual(mockReport);
  });

  it('returns null report when none exists', async () => {
    reportsIpc.getByIntervention.mockResolvedValue(null);

    const { result } = renderHook(
      () => useInterventionReport({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.report).toBeNull();
  });

  it('sets generating true during mutation and shows success toast', async () => {
    reportsIpc.getByIntervention.mockResolvedValue(null);
    reportsIpc.generate.mockResolvedValue(mockReport);

    const { result } = renderHook(
      () => useInterventionReport({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.generateReport());

    await waitFor(() => expect(result.current.generating).toBe(false));

    expect(toast.success).toHaveBeenCalledWith('Rapport INT-2024-0001 généré avec succès');
    expect(result.current.report).toEqual(mockReport);
  });

  it('shows error toast when generate fails', async () => {
    reportsIpc.getByIntervention.mockResolvedValue(null);
    reportsIpc.generate.mockRejectedValue(new Error('Génération échouée'));

    const { result } = renderHook(
      () => useInterventionReport({ interventionId: 'inter-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.generateReport());

    await waitFor(() => expect(result.current.generating).toBe(false));

    expect(toast.error).toHaveBeenCalledWith('Génération échouée');
  });

  it('does not call generate when interventionId is null', () => {
    const { result } = renderHook(
      () => useInterventionReport({ interventionId: null }),
      { wrapper: createWrapper() },
    );

    act(() => result.current.generateReport());

    expect(reportsIpc.generate).not.toHaveBeenCalled();
  });
});
