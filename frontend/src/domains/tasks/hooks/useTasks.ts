import { useAuth } from '@/domains/auth';
import { useTaskState } from './useTaskState';
import { useTaskActions } from './useTaskActions';
import { useTaskSync } from './useTaskSync';
import { useTaskFilters } from './useTaskFilters';
import type { TaskStatus, TaskPriority } from '@/lib/backend';

interface UseTasksOptions {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  search?: string;
  assignedTo?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  pageSize?: number;
  autoFetch?: boolean;
}

export const useTasks = (options: UseTasksOptions = {}) => {
  const { user } = useAuth();
  const {
    status = 'all',
    priority = 'all' as TaskPriority | 'all',
    search = '',
    pageSize = 10,
    autoFetch = true,
    ...restOptions
  } = options;

  // State management
  const state = useTaskState({
    initialFilters: { status, priority, search, ...restOptions },
    pageSize,
  });

  // Actions
  const actions = useTaskActions({
    userToken: user?.token,
    onTaskUpdate: state.updateTask,
    onTaskAdd: state.addTask,
    onTaskRemove: state.removeTask,
    onLoadingChange: state.setLoadingState,
    onError: state.setErrorState,
  });

  // Data synchronization
  const sync = useTaskSync({
    userToken: user?.token,
    filters: state.filters,
    pageSize,
    autoFetch,
    onTasksLoaded: (tasks, pagination) => {
      state.updateTasks(tasks);
      state.updatePagination(pagination);
    },
    onLoadingChange: state.setLoadingState,
    onError: state.setErrorState,
  });

  // Filter helpers
  const filters = useTaskFilters({
    onFiltersChange: state.updateFilters,
  });

  return {
    // State
    tasks: state.tasks,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    filters: state.filters,

    // Actions
    refetch: sync.refetch,
    goToPage: sync.goToPage,
    updateFilters: state.updateFilters,
    updateTask: actions.updateTask,
    updateTaskStatus: actions.updateTaskStatus,
    updateTaskPriority: actions.updateTaskPriority,
    deleteTask: actions.deleteTask,
    createTask: actions.createTask,

    // Derived state
    hasNextPage: state.hasNextPage,
    hasPreviousPage: state.hasPreviousPage,

    // Filter helpers
    setStatusFilter: filters.setStatusFilter,
    setPriorityFilter: filters.setPriorityFilter,
    setSearchQuery: filters.setSearchQuery,
    setAssignedToFilter: filters.setAssignedToFilter,
    setDateRangeFilter: filters.setDateRangeFilter,
    clearFilters: filters.clearFilters,
    hasActiveFilters: filters.hasActiveFilters(state.filters),
  };
};

export default useTasks;
