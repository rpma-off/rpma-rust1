/**
 * Dashboard Data Hook
 *
 * Provides optimized dashboard data management with:
 * - Unified state management
 * - Intelligent caching via DashboardApiService
 * - Connection monitoring
 * - Optimistic updates
 * - Auto-refresh capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/domains/auth';
import { dashboardApiService, DashboardFilters, DashboardData, TechnicianSummary } from '../server';
import { TaskWithDetails } from '@/types/task.types';
import { DashboardTask, transformTask, RawTaskData } from '@/domains/analytics/components/dashboard/types';
import { handleFetchError, FetchError } from '@/lib/utils/fetch-error-handler';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { normalizeError } from '@/types/utility.types';
import { ipcClient } from '@/lib/ipc';

export interface DashboardState {
  // Data
  tasks: DashboardTask[];
  stats: DashboardData['stats'] | null;
  technicians: TechnicianSummary[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingTechnicians: boolean;

  // Error states
  error: FetchError | null;

  // Connection state
  connectionStatus: 'online' | 'offline' | 'checking';

  // Metadata
  lastUpdated: Date | null;
  cacheStats: {
    hits: number;
    misses: number;
    size: number;
  } | null;
}

export interface DashboardActions {
  // Data fetching
  refresh: () => Promise<void>;
  refreshTechnicians: () => Promise<void>;

  // Cache management
  clearCache: () => void;

  // Connection management
  checkConnection: () => Promise<boolean>;

  // Task operations
  updateTaskOptimistic: (taskId: string, updates: Partial<DashboardTask>) => void;

  // Error handling
  retry: () => Promise<void>;
  clearError: () => void;
}

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

export function useDashboardData(options: UseDashboardDataOptions = {}): [DashboardState, DashboardActions] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { user } = useAuth();
  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'useDashboardData'
  });

  // State
  const [state, setState] = useState<DashboardState>({
    tasks: [],
    stats: null,
    technicians: [],
    isLoading: true,
    isRefreshing: false,
    isLoadingTechnicians: false,
    error: null,
    connectionStatus: 'online',
    lastUpdated: null,
    cacheStats: null
  });

    // Refs for cleanup and intervals
    const refreshInterval = useRef<NodeJS.Timeout | null>(null);
    const isAdmin = user?.role === 'admin';

  // Build filters from current state and options
  const buildFilters = useCallback((): DashboardFilters => {
    if (!user?.id) throw new Error('User not authenticated');

    return {
      isAdmin: isAdmin,
      userId: user.id,
      selectedTechnicianId: opts.selectedTechnicianId,
      status: opts.statusFilter,
      search: opts.searchQuery
    };
  }, [user?.id, isAdmin, opts.selectedTechnicianId, opts.statusFilter, opts.searchQuery]);

  // Transform tasks for dashboard consumption
  const transformTasks = useCallback((tasks: TaskWithDetails[]): DashboardTask[] => {
    return tasks.map((task: TaskWithDetails) => {
      try {
        // Look up technician data from the technicians array
        const technician = state.technicians.find(t => t.id === task.technician_id) || null;

        // Map TaskWithDetails to RawTaskData format expected by transformTask
        const rawTask: RawTaskData = {
          id: task.id,
          title: task.title,
          vehicle_plate: task.vehicle_plate,
          vehicle_model: task.vehicle_model,
          vehicle_year: task.vehicle_year,
          ppf_zones: task.ppf_zones,
           technician: technician ? {
             id: technician.id,
             name: technician.name,
             email: technician.email,
             initials: technician.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
           } : null,
          status: task.status,
          start_time: task.start_time,
          end_time: task.end_time,
          scheduled_date: task.scheduled_date,
          checklist_completed: task.checklist_completed || false,
          photos_before: task.photos_before || [], // Use actual photo data if available
          photos_after: task.photos_after || [],
          checklist_items: task.checklist_items || [],
          created_at: task.created_at as unknown as string,
          updated_at: task.updated_at as unknown as string,
          customer_name: task.customer_name
        };
        return transformTask(rawTask);
      } catch (error: unknown) {
        const normalizedError = normalizeError(error);
        logError('Failed to transform task', normalizedError, { taskId: task.id });
        return null;
      }
    }).filter((task): task is DashboardTask => task !== null);
  }, [state.technicians, logError]);

  // Connection monitoring
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!opts.enableConnectionMonitoring) return true;

    try {
      setState(prev => ({ ...prev, connectionStatus: 'checking' }));

      // Use IPC health check instead of HTTP API
      const healthResult = await ipcClient.admin.healthCheck();
      const isOnline = !!healthResult;
      setState(prev => ({
        ...prev,
        connectionStatus: isOnline ? 'online' : 'offline'
      }));

      return isOnline;
    } catch {
      setState(prev => ({ ...prev, connectionStatus: 'offline' }));
      return false;
    }
  }, [opts.enableConnectionMonitoring]);

  // Fetch dashboard data
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!user?.id) return;

      if (isRefresh) {
        setState(prev => ({ ...prev, isRefreshing: true, error: null }));
      } else {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      const filters = buildFilters();
      logInfo('Fetching dashboard data', { filters, isRefresh });

      const result = await dashboardApiService.getDashboardData(filters);

      if (result.error) {
        throw result.error;
      }

      if (result.data) {
        const transformedTasks = transformTasks(result.data.tasks as TaskWithDetails[]);

        setState(prev => ({
          ...prev,
          tasks: transformedTasks,
          stats: result.data!.stats,
          lastUpdated: new Date(result.data!.lastUpdated),
          cacheStats: null, // TODO: Implement cache stats tracking
          isLoading: false,
          isRefreshing: false,
          error: null
        }));

        logInfo('Dashboard data loaded successfully', {
          taskCount: transformedTasks.length
        });
      }

    } catch (error: unknown) {
      const fetchError = handleFetchError(error, 'useDashboardData.fetchData');
      const normalizedError = normalizeError(error);
      logError('Failed to fetch dashboard data', normalizedError);

      setState(prev => ({
        ...prev,
        error: fetchError,
        isLoading: false,
        isRefreshing: false
      }));
    }
  }, [user?.id, buildFilters, transformTasks, logInfo, logError]);

  // Fetch technicians (for admins)
  const fetchTechnicians = useCallback(async () => {
    if (!isAdmin) {
      setState(prev => ({ ...prev, technicians: [] }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoadingTechnicians: true }));

      const result = await dashboardApiService.getTechnicians();

      if (result.error) {
        logError('Failed to fetch technicians', result.error);
        return;
      }

      setState(prev => ({
        ...prev,
        technicians: (result.data || []) as TechnicianSummary[],
        isLoadingTechnicians: false
      }));

      logInfo('Technicians loaded successfully', {
        count: result.data?.length || 0
      });

    } catch (error: unknown) {
      const normalizedError = normalizeError(error);
      logError('Failed to fetch technicians', normalizedError);
      setState(prev => ({ ...prev, isLoadingTechnicians: false }));
    }
  }, [isAdmin, logInfo, logError]);

  // Optimistic task update
  const updateTaskOptimistic = useCallback((taskId: string, updates: Partial<DashboardTask>) => {
    if (!opts.enableOptimisticUpdates) return;

    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    }));

    logUserAction('Task updated optimistically', { taskId, updates });
  }, [opts.enableOptimisticUpdates, logUserAction]);

  // Actions
  const actions: DashboardActions = {
    refresh: useCallback(() => fetchData(true), [fetchData]),
    refreshTechnicians: fetchTechnicians,
    clearCache: useCallback(() => {
      dashboardApiService.clearCache();
      setState(prev => ({
        ...prev,
        cacheStats: null
      }));
      logInfo('Dashboard cache cleared');
    }, [logInfo]),
    checkConnection,
    updateTaskOptimistic,
    retry: useCallback(async () => {
      const isOnline = await checkConnection();
      if (isOnline) {
        await fetchData(true);
      }
    }, [checkConnection, fetchData]),
    clearError: useCallback(() => {
      setState(prev => ({ ...prev, error: null }));
    }, [])
  };

  // Initialize data loading
  useEffect(() => {
    fetchData();
    fetchTechnicians();
  }, [fetchData, fetchTechnicians]);

  // Auto-refresh setup
  useEffect(() => {
    if (!opts.autoRefresh) return;

    refreshInterval.current = setInterval(() => {
      if (state.connectionStatus === 'online' && !state.isLoading) {
        fetchData(true);
      }
    }, opts.refreshInterval);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [opts.autoRefresh, opts.refreshInterval, state.connectionStatus, state.isLoading, fetchData]);

  // Connection monitoring setup
  useEffect(() => {
    if (!opts.enableConnectionMonitoring) return;

    const handleOnline = () => setState(prev => ({ ...prev, connectionStatus: 'online' }));
    const handleOffline = () => setState(prev => ({ ...prev, connectionStatus: 'offline' }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setState(prev => ({
      ...prev,
      connectionStatus: navigator.onLine ? 'online' : 'offline'
    }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [opts.enableConnectionMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  return [state, actions];
}

