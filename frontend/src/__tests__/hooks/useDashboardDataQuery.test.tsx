import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardData } from '../../hooks/useDashboardDataQuery';
import { taskService } from '../../lib/services/entities/task.service';
import type { TaskWithDetails } from '../../types/task.types';
import { dashboardApiService } from '../../lib/services/dashboard/dashboard-api.service';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { user_id: 'user-1', role: 'technician', token: 'token-123' },
    profile: null,
    loading: false,
    isAuthenticating: false,
  }),
}));

jest.mock('../../hooks/useLogger', () => ({
  useLogger: () => ({
    logInfo: jest.fn(),
    logError: jest.fn(),
  }),
}));

jest.mock('../../lib/services/entities/task.service', () => ({
  taskService: {
    getTasks: jest.fn(),
  },
}));

jest.mock('../../lib/services/dashboard/dashboard-api.service', () => ({
  dashboardApiService: {
    getTechnicians: jest.fn(),
    getCacheStats: jest.fn(),
    clearCache: jest.fn(),
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

describe('useDashboardDataQuery', () => {
  const mockTaskService = taskService as jest.Mocked<typeof taskService>;
  const mockDashboardApi = dashboardApiService as jest.Mocked<typeof dashboardApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboardApi.getCacheStats.mockReturnValue({
      size: 0,
      hitRate: 0,
      lastCleared: new Date().toISOString()
    });
  });

  it('calculates dashboard stats from fetched tasks', async () => {
    const taskOne = {
      id: 'task-1',
      title: 'Task 1',
      vehicle_plate: 'ABC-123',
      vehicle_model: 'Model X',
      vehicle_year: '2024',
      ppf_zones: ['front'],
      status: 'completed',
      start_time: null,
      end_time: null,
      scheduled_date: null,
      checklist_completed: true,
      photos_before: [],
      photos_after: [],
      checklist_items: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      progress: 0,
      is_overdue: false,
    } as unknown as TaskWithDetails;

    const taskTwo = {
      ...taskOne,
      id: 'task-2',
      title: 'Task 2',
      status: 'in_progress',
    } as unknown as TaskWithDetails;

    mockTaskService.getTasks.mockResolvedValue({
      success: true,
      data: {
        data: [taskOne, taskTwo],
        pagination: { page: 1, total: 2, total_pages: 1, limit: 10 },
      },
      status: 200,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toMatchObject({
      total: 2,
      completed: 1,
      inProgress: 1,
      pending: 0,
      completionRate: 50,
    });
    expect(result.current.tasks).toHaveLength(2);
  });
});
