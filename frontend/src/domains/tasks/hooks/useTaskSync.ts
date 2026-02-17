import { useCallback, useEffect, useRef } from 'react';
import { TaskStatus, TaskPriority } from '@/lib/backend';
import { taskService } from '../services/task.service';
import { ApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import type { TaskWithDetails } from '@/lib/services/entities/task.service';

interface TaskFilters {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  search: string;
  assignedTo?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
}

interface TaskPagination {
  page: number;
  total: number;
  totalPages: number;
  limit: number;
}

interface UseTaskSyncProps {
  userToken?: string;
  filters: TaskFilters;
  pageSize: number;
  autoFetch?: boolean;
  onTasksLoaded?: (tasks: TaskWithDetails[], pagination: TaskPagination) => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: Error | null) => void;
}

export function useTaskSync({
  userToken,
  filters,
  pageSize,
  autoFetch = true,
  onTasksLoaded,
  onLoadingChange,
  onError,
}: UseTaskSyncProps) {
  const fetchInProgressRef = useRef(false);

  const fetchTasks = useCallback(async (page = 1, newFilters = filters) => {
    // Prevent duplicate fetches
    if (fetchInProgressRef.current) {
      logger.debug('useTaskSync: Fetch already in progress, skipping', {
        page,
        filters: newFilters,
      });
      return null;
    }
    const requestId = Math.random().toString(36).substring(7);
    logger.debug('useTaskSync: fetchTasks called', {
      page,
      filters: newFilters,
      requestId,
    });

    try {
      // Check if user is authenticated
      if (!userToken) {
        logger.warn('useTaskSync: User not authenticated, skipping fetch', {
          requestId,
        });
        fetchInProgressRef.current = false;
        onLoadingChange?.(false);
        onError?.(new Error('Authentication required'));
        return null;
      }

      fetchInProgressRef.current = true;
      onLoadingChange?.(true);
      onError?.(null);

      // Build query parameters
      const queryParams = {
        page,
        limit: pageSize,
        status: newFilters.status !== 'all' ? newFilters.status : undefined,
        search: newFilters.search || undefined,
        technician_id: newFilters.assignedTo || undefined,
        from_date: newFilters.startDate || undefined,
        to_date: newFilters.endDate || undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      };

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_key, value]) => value !== undefined && value !== null && value !== '')
      );

      logger.info('useTaskSync: calling taskService.getTasks', {
        filters: cleanParams,
        requestId,
      });

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });

      const result = await Promise.race([
        taskService.getTasks(cleanParams),
        timeoutPromise
      ]) as { success?: boolean; data?: { data: TaskWithDetails[]; pagination?: Record<string, unknown> }; error?: Error | null };

      logger.debug('useTaskSync: TaskService result received', {
        success: result.success,
        hasData: !!result.data,
        hasError: !!result.error,
        requestId,
      });

      if (result.error) {
        logger.error('useTaskSync: TaskService returned error', {
          error: result.error,
          requestId,
        });
        throw result.error;
      }

      const data = result.data!;
      logger.info('useTaskSync: tasks fetched successfully', {
        taskCount: data.data?.length || 0,
        total: data.pagination?.total || 0,
        page: data.pagination?.page,
        requestId,
      });

      const paginationSource = data.pagination as Record<string, unknown> | undefined;
      const pagination: TaskPagination = {
        page: (paginationSource?.page as number) ?? page,
        total: Number(paginationSource?.total ?? 0),
        totalPages: (paginationSource?.totalPages as number) ?? (paginationSource?.total_pages as number) ?? 1,
        limit: (paginationSource?.pageSize as number) ?? (paginationSource?.limit as number) ?? pageSize,
      };

      onTasksLoaded?.(data.data, pagination);

      return { tasks: data.data, pagination };
    } catch (err) {
      logger.error('useTaskSync: failed to fetch tasks', {
        error: err instanceof Error ? err.message : String(err),
        errorType: err instanceof Error ? err.name : typeof err,
        requestId,
      });

      // Handle different error types
      let errorMessage = 'Failed to fetch tasks';
      if (err instanceof ApiError) {
        errorMessage = err.message;

        // Show user-friendly toast based on error status
        if (err.status === 401) {
          // Toast handled by parent component
        } else if (err.status === 403) {
          // Toast handled by parent component
        } else if (err instanceof ApiError && err.status != null && err.status >= 500) {
          // Toast handled by parent component
        } else {
          // Toast handled by parent component
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      onError?.(err instanceof Error ? err : new Error(errorMessage));
      return null;
    } finally {
      fetchInProgressRef.current = false;
      onLoadingChange?.(false);
      logger.debug('useTaskSync: fetchTasks completed', {
        requestId,
      });
    }
    }, [userToken, pageSize, onTasksLoaded, onLoadingChange, onError, filters]);

  const refetch = useCallback(async () => {
    return await fetchTasks(1);
  }, [fetchTasks]);

  const goToPage = useCallback(async (page: number) => {
    return await fetchTasks(page);
  }, [fetchTasks]);

  // Combined fetch effect - handles both initial load and filter changes
  useEffect(() => {
    if (autoFetch && userToken) {
      fetchTasks(1, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, userToken, filters]); // Only depends on actual trigger values

  return {
    fetchTasks,
    refetch,
    goToPage,
  };
}
