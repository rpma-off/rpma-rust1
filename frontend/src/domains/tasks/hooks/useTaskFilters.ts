import { useCallback } from 'react';
import { TaskStatus, TaskPriority } from '@/lib/backend';
import { useFilterState } from '@/shared/hooks/useFilterState';

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
  initialFilters: _initialFilters = {},
  onFiltersChange,
}: UseTaskFiltersProps = {}) {
  const { updateFilters, clearFilters: clearFilterState, hasActiveFilters: hasActiveFromState } = useFilterState<TaskFilters>(onFiltersChange);

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
    clearFilterState({
      status: 'all',
      priority: 'all',
      search: '',
      assignedTo: undefined,
      vehicleId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  }, [clearFilterState]);

  const hasActiveFilters = useCallback((filters: TaskFilters) => {
    return hasActiveFromState(filters, (currentFilters) =>
      currentFilters.status !== 'all' ||
      currentFilters.priority !== 'all' ||
      currentFilters.search !== '' ||
      !!currentFilters.assignedTo ||
      !!currentFilters.vehicleId ||
      !!currentFilters.startDate ||
      !!currentFilters.endDate
    );
  }, [hasActiveFromState]);

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
