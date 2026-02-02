import { useState, useCallback } from 'react';
import { TaskStatus, TaskPriority } from '@/lib/backend';
import { TaskWithDetails } from '@/lib/services/entities/task.service';

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

interface UseTaskStateOptions {
  initialFilters?: Partial<TaskFilters>;
  pageSize?: number;
}

export function useTaskState(options: UseTaskStateOptions = {}) {
  const {
    initialFilters = {},
    pageSize = 10,
  } = options;

  // Core state
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState<TaskPagination>({
    page: 1,
    total: 0,
    totalPages: 1,
    limit: pageSize,
  });

  // Filters state
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    search: '',
    ...initialFilters,
  });

  // State update helpers
  const updateTasks = useCallback((newTasks: TaskWithDetails[] | null | undefined) => {
    // Handle null/undefined inputs gracefully
    if (!newTasks) {
      setTasks([]);
      setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
      return;
    }
    
    // Handle non-array inputs
    if (!Array.isArray(newTasks)) {
      console.warn('useTaskState: updateTasks called with non-array input, resetting to empty array');
      setTasks([]);
      setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
      return;
    }
    
    setTasks(newTasks);
  }, []);

  const addTask = useCallback((task: TaskWithDetails | null | undefined) => {
    if (!task) {
      console.warn('useTaskState: addTask called with undefined/null task, skipping');
      return;
    }
    
    setTasks(prev => [task, ...prev]);
    setPagination(prev => ({
      ...prev,
      total: prev.total + 1,
      totalPages: Math.ceil((prev.total + 1) / prev.limit)
    }));
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<TaskWithDetails>) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const filtered = prev.filter(task => task.id !== taskId);
      const newTotal = filtered.length;
      // Update pagination based on new total
      setPagination(paginationPrev => ({
        ...paginationPrev,
        total: newTotal,
        totalPages: Math.ceil(newTotal / paginationPrev.limit)
      }));
      return filtered;
    });
  }, []);

  const setLoadingState = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const setErrorState = useCallback((error: Error | null) => {
    setError(error);
  }, []);

  const updatePagination = useCallback((newPagination: Partial<TaskPagination>) => {
    setPagination(prev => {
      const updated = { ...prev, ...newPagination };
      // Recalculate totalPages if total changed
      if ('total' in newPagination && newPagination.total !== undefined) {
        updated.totalPages = Math.ceil(newPagination.total / prev.limit);
      }
      return updated;
    });
  }, []);

  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const reset = useCallback(() => {
    setTasks([]);
    setLoading(false);
    setError(null);
    setPagination({
      page: 1,
      total: 0,
      totalPages: 1,
      limit: pageSize,
    });
    setFilters({
      status: 'all',
      priority: 'all',
      search: '',
    });
  }, [pageSize]);

  return {
    // State
    tasks,
    loading,
    error,
    pagination,
    filters,

    // Actions
    updateTasks,
    addTask,
    updateTask,
    removeTask,
    setLoadingState,
    setErrorState,
    updatePagination,
    updateFilters,
    reset,

    // Computed (with null safety and edge case handling)
    hasNextPage: pagination.page < pagination.totalPages && pagination.page > 0,
    hasPreviousPage: pagination.page > 1 || pagination.page < 0, // Handle negative values as having previous pages
    isEmpty: (tasks || []).length === 0,
  };
}