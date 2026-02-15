import { useCallback } from 'react';
import { TaskStatus, TaskPriority } from '@/lib/backend';

interface TaskFilters {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  search: string;
  assignedTo?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
}

interface UseTaskFiltersProps {
  initialFilters?: Partial<TaskFilters>;
  onFiltersChange?: (filters: TaskFilters) => void;
}

export function useTaskFilters({
  _initialFilters = {},
  onFiltersChange,
}: UseTaskFiltersProps = {}) {
  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    // This would be handled by the parent component's state management
    // The actual filter state is managed in useTaskState
    onFiltersChange?.(newFilters as TaskFilters);
  }, [onFiltersChange]);

  const setStatusFilter = useCallback((status: TaskStatus | 'all') => {
    updateFilters({ status });
  }, [updateFilters]);

  const setPriorityFilter = useCallback((priority: TaskPriority | 'all') => {
    updateFilters({ priority });
  }, [updateFilters]);

  const setSearchQuery = useCallback((search: string) => {
    updateFilters({ search });
  }, [updateFilters]);

  const setAssignedToFilter = useCallback((assignedTo: string) => {
    updateFilters({ assignedTo });
  }, [updateFilters]);

  const setDateRangeFilter = useCallback((startDate: string, endDate: string) => {
    updateFilters({ startDate, endDate });
  }, [updateFilters]);

  const clearFilters = useCallback(() => {
    updateFilters({
      status: 'all',
      priority: 'all',
      search: '',
      assignedTo: undefined,
      vehicleId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  }, [updateFilters]);

  const hasActiveFilters = useCallback((filters: TaskFilters) => {
    return filters.status !== 'all' ||
           filters.priority !== 'all' ||
           filters.search !== '' ||
           !!filters.assignedTo ||
           !!filters.vehicleId ||
           !!filters.startDate ||
           !!filters.endDate;
  }, []);

  return {
    updateFilters,
    setStatusFilter,
    setPriorityFilter,
    setSearchQuery,
    setAssignedToFilter,
    setDateRangeFilter,
    clearFilters,
    hasActiveFilters,
  };
}