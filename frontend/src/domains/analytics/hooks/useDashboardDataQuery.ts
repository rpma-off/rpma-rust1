import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { dashboardApiService, DashboardFilters } from '../server';
import { TaskWithDetails } from '@/types/task.types';
import { DashboardTask, RawTaskData, transformTask } from '@/domains/analytics/components/dashboard/types';
import { FetchError } from '@/lib/utils/fetch-error-handler';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { useAuth } from '@/domains/auth';
import { taskService } from '@/domains/tasks';


// ==================== DASHBOARD QUERY KEYS ====================

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  dashboard: (filters: DashboardFilters) => ['dashboard', filters] as const,
  technicians: () => ['dashboard', 'technicians'] as const,
  tasks: (filters: Partial<DashboardFilters>) => ['dashboard', 'tasks', filters] as const,
};

// ==================== DASHBOARD QUERY HOOKS ====================

export interface UseDashboardDataOptions {
  // Auto-refresh settings
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds

  // Filters
  selectedTechnicianId?: string;
  statusFilter?: string;
  searchQuery?: string;

  // Connection monitoring
  enableConnectionMonitoring?: boolean;

  // Performance
  enableOptimisticUpdates?: boolean;
}

const DEFAULT_OPTIONS: UseDashboardDataOptions = {
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
  enableConnectionMonitoring: true,
  enableOptimisticUpdates: true
};

/**
 * Main dashboard data hook using TanStack Query
 */
export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { logInfo, logError } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'useDashboardDataQuery'
  });

  // Get user data from auth context
  const { user: authUser, loading: authLoading, isAuthenticating } = useAuth();

  // Derive user state from auth context
  const user = authUser ? {
    id: authUser.user_id, // Use user_id instead of session id
    role: authUser.role,
    token: authUser.token
  } : null;

  const isAdmin = user?.role === 'admin';

  // Validate user permissions. This should be called inside queryFn.
  const validateUserAccess = () => {
    if (!user) {
      throw new Error('User not authenticated');
    }
  };

  // Build filters from current state and options
  const buildFilters = (userId: string, isAdmin: boolean): DashboardFilters => {
    // Validation is now handled inside the queryFn
    return {
      isAdmin,
      userId,
      selectedTechnicianId: opts.selectedTechnicianId,
      status: opts.statusFilter,
      search: opts.searchQuery
    };
  };

  // Transform tasks for dashboard consumption
  const transformTasks = (tasks: TaskWithDetails[]): DashboardTask[] => {
    return tasks.map((task: TaskWithDetails) => {
      try {
        // Map TaskWithDetails to RawTaskData format
        const rawTask: RawTaskData = {
          id: task.id,
          title: task.title,
          vehicle_plate: task.vehicle_plate,
          vehicle_model: task.vehicle_model,
          vehicle_year: task.vehicle_year?.toString(),
          ppf_zones: task.ppf_zones,
          technician: task.technician ? {
            id: task.technician.id,
            name: task.technician.first_name && task.technician.last_name
              ? `${task.technician.first_name} ${task.technician.last_name}`
              : task.technician.first_name || task.technician.last_name || null,
            first_name: task.technician.first_name,
            last_name: task.technician.last_name,
            email: task.technician.email,
            initials: task.technician.first_name && task.technician.last_name
              ? `${task.technician.first_name[0]}${task.technician.last_name[0]}`.toUpperCase()
              : (task.technician.first_name?.[0] || task.technician.last_name?.[0] || 'NA')
          } : null,
          status: task.status,
          start_time: task.start_time,
          end_time: task.end_time,
          scheduled_date: task.scheduled_date,
          checklist_completed: task.checklist_completed,
          photos_before: task.photos_before,
          photos_after: task.photos_after,
          checklist_items: task.checklist_items,
          created_at: task.created_at as unknown as string,
          updated_at: task.updated_at as unknown as string,
          customer_name: task.client?.name || null
        };
        return transformTask(rawTask);
      } catch (error) {
        logError('Failed to transform task', error, { taskId: task.id });
        return null;
      }
    }).filter(Boolean) as DashboardTask[];
  };

  const dashboardFilters = useMemo(() => ({
    isAdmin,
    userId: user?.id || '',
    selectedTechnicianId: opts.selectedTechnicianId,
    status: opts.statusFilter,
    search: opts.searchQuery
  }), [user?.id, isAdmin, opts.selectedTechnicianId, opts.statusFilter, opts.searchQuery]);

  // Dashboard data query
  const dashboardQuery = useQuery({
    queryKey: dashboardQueryKeys.dashboard(dashboardFilters),
    queryFn: async ({ queryKey }) => {
      validateUserAccess(); // Validate right before fetching
      const [, filters] = queryKey as [string, DashboardFilters];
      logInfo('Fetching dashboard data', { filters });

      // Use the same pattern as tasks page
      const taskResult = await taskService.getTasks({
        page: 1,
        limit: 10,
        status: undefined,
        search: undefined,
        from_date: undefined,
        to_date: undefined,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      if (!taskResult.success) {
        // If the error is due to no tasks existing or database issues, treat it as successful with empty data
        logInfo('Task fetch failed, returning empty data', { error: taskResult.error });
        return {
          tasks: [],
          stats: {
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            completionRate: 0
          },
          lastUpdated: new Date().toISOString()
        };
      }

      const tasks = taskResult.data?.data || [];
      const transformedTasks = transformTasks(tasks);

      // Calculate stats from fetched tasks
      const stats = transformedTasks.reduce((acc, task) => {
        acc.total += 1;
        if (task.status === 'completed') {
          acc.completed += 1;
        } else if (task.status === 'in_progress') {
          acc.inProgress += 1;
        } else if (task.status === 'pending') {
          acc.pending += 1;
        }
        return acc;
      }, {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0
      });
      const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

      logInfo('Dashboard data loaded successfully', {
        taskCount: transformedTasks.length,
        cached: false // TanStack Query handles caching
      });

      return {
        tasks: transformedTasks,
        stats: {
          total: stats.total,
          completed: stats.completed,
          inProgress: stats.inProgress,
          pending: stats.pending,
          completionRate
        },
        lastUpdated: new Date().toISOString()
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: opts.autoRefresh ? opts.refreshInterval : false,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof FetchError && error.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
    enabled: !!user?.id && !authLoading && !isAuthenticating, // Enable when user data is available and auth is not loading or authenticating
  });

  // Technicians query
  const techniciansQuery = useQuery({
    queryKey: dashboardQueryKeys.technicians(),
    queryFn: async () => {
      validateUserAccess(); // Validate right before fetching
      logInfo('Fetching technicians');

      const result = await dashboardApiService.getTechnicians();

      if (result.error) {
        // If the error is due to no technicians, treat as empty array
        if (result.error.message?.toLowerCase().includes('no technicians') ||
            result.status === 404) {
          logInfo('No technicians found, returning empty array');
          return [];
        }
        throw new FetchError(
          result.error.message,
          (result.error as { code?: string }).code || 'FETCH_ERROR',
          500,
          { operation: 'getTechnicians' }
        );
      }

      logInfo('Technicians loaded successfully', {
        count: result.data?.length || 0
      });

      return result.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: isAdmin && !!user?.id && !authLoading && !isAuthenticating, // Only fetch for admins when auth is not loading or authenticating
  });

  // Query client for mutations
  const queryClient = useQueryClient();


  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => {
      dashboardApiService.clearCache();
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidate all dashboard queries
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
      logInfo('Dashboard cache cleared');
    }
  });

  return {
    // Data
    tasks: dashboardQuery.data?.tasks || [],
    stats: dashboardQuery.data?.stats || null,
    technicians: techniciansQuery.data || [],
    lastUpdated: dashboardQuery.data?.lastUpdated || null,

    // Loading states
    isLoading: dashboardQuery.isLoading || authLoading || isAuthenticating,
    isRefreshing: dashboardQuery.isFetching,
    isLoadingTechnicians: techniciansQuery.isLoading,
    isAuthLoading: authLoading,
    isAuthenticating,

    // Error states
    error: dashboardQuery.error as FetchError | null,
    authError: !authUser && !authLoading ? 'User not authenticated' : null,

    // Connection state (placeholder - would need connection monitoring)
    connectionStatus: 'online' as const,

    // Cache stats
    cacheStats: dashboardApiService.getCacheStats(),

    // Actions
    refetch: () => dashboardQuery.refetch(),
    refreshTechnicians: () => techniciansQuery.refetch(),
    clearCache: () => clearCacheMutation.mutateAsync(),

    // Utility functions
    buildFilters,
    transformTasks,
  };
}

/**
 * Hook for dashboard tasks with advanced filtering
 */
export function useDashboardTasks(filters: Partial<DashboardFilters>) {
  const { logInfo } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'useDashboardTasks'
  });

  return useQuery({
    queryKey: dashboardQueryKeys.tasks(filters),
    queryFn: async () => {
      logInfo('Fetching dashboard tasks', { filters });

      const result = await dashboardApiService.getDashboardData(filters as DashboardFilters);

      if (result.error) {
        throw new FetchError(
          result.error.message,
          (result.error as { code?: string }).code || 'FETCH_ERROR',
          500,
          { operation: 'getTechnicians' }
        );
      }

      logInfo('Dashboard tasks loaded successfully', {
        taskCount: result.data?.tasks.length || 0
      });

      return result.data?.tasks || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for technicians data
 */
export function useTechnicians() {
  const { logInfo } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'useTechnicians'
  });

  return useQuery({
    queryKey: dashboardQueryKeys.technicians(),
    queryFn: async () => {
      logInfo('Fetching technicians');

      const result = await dashboardApiService.getTechnicians();

      if (result.error) {
        throw new FetchError(
          result.error.message,
          (result.error as { code?: string }).code || 'FETCH_ERROR',
          500,
          { operation: 'getTechnicians' }
        );
      }

      logInfo('Technicians loaded successfully', {
        count: result.data?.length || 0
      });

      return result.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}


