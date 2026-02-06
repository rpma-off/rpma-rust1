import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCalendarTasks, checkCalendarConflicts, rescheduleTask, createCalendarFilter } from '@/lib/ipc/calendar';
import type { CalendarTask, ConflictDetection } from '@/lib/backend';
import { useAuth } from '@/lib/auth/compatibility';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarState {
  tasks: CalendarTask[];
  isLoading: boolean;
  error: string | null;
  currentDate: Date;
  viewMode: CalendarViewMode;
  filters: {
    technicianIds?: string[];
    statuses?: string[];
    priorities?: string[];
  };
}

export interface UseCalendarReturn extends CalendarState {
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setFilters: (filters: CalendarState['filters']) => void;
  refreshTasks: () => Promise<void>;
  checkConflicts: (taskId: string, newDate: string, newStart?: string, newEnd?: string) => Promise<ConflictDetection>;
  rescheduleTaskWithConflictCheck: (
    taskId: string,
    newDate: string,
    newStart?: string,
    newEnd?: string,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useCalendar(initialDate?: Date, initialViewMode?: CalendarViewMode): UseCalendarReturn {
  const { user } = useAuth();
  const [state, setState] = useState<CalendarState>({
    tasks: [],
    isLoading: false,
    error: null,
    currentDate: initialDate || new Date(),
    viewMode: initialViewMode || 'month',
    filters: {},
  });

  const getDateRangeForView = useCallback((date: Date, viewMode: CalendarViewMode): { start: string; end: string } => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (viewMode) {
      case 'month': {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      }
      case 'week': {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0],
        };
      }
      case 'day': {
        const start = new Date(year, month, day);
        const end = new Date(year, month, day);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      }
      case 'agenda': {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(date.getDate() + 30); // 30-day range for agenda
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      }
      default:
        return {
          start: date.toISOString().split('T')[0],
          end: date.toISOString().split('T')[0],
        };
    }
  }, []);

  // Memoize date range to prevent unnecessary re-fetches
  const dateRange = useMemo(() => {
    return getDateRangeForView(state.currentDate, state.viewMode);
  }, [state.currentDate, state.viewMode]);

  // Memoize filter to prevent unnecessary re-fetches
  const calendarFilter = useMemo(() => {
    return createCalendarFilter(
      dateRange.start,
      dateRange.end,
      state.filters.technicianIds,
      state.filters.statuses
    );
  }, [dateRange, state.filters.technicianIds, state.filters.statuses]);

  const fetchTasks = useCallback(async () => {
    if (!user?.token) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        tasks: [],
        error: 'Authentication required to load calendar tasks',
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const tasks = await getCalendarTasks(calendarFilter, user.token);
      setState(prev => ({ ...prev, tasks, isLoading: false }));
    } catch (error) {
      console.error('Failed to fetch calendar tasks:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load calendar tasks',
      }));
    }
  }, [calendarFilter]);

  const setCurrentDate = useCallback((date: Date) => {
    setState(prev => ({ ...prev, currentDate: date }));
  }, []);

  const setViewMode = useCallback((viewMode: CalendarViewMode) => {
    setState(prev => ({ ...prev, viewMode }));
  }, []);

  const setFilters = useCallback((filters: CalendarState['filters']) => {
    setState(prev => ({ ...prev, filters }));
  }, []);

  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  const checkConflicts = useCallback(async (
    taskId: string,
    newDate: string,
    newStart?: string,
    newEnd?: string
  ): Promise<ConflictDetection> => {
    if (!user?.token) {
      return {
        has_conflict: false,
        conflict_type: null,
        conflicting_tasks: [],
        message: 'Authentication required to check conflicts',
      };
    }
    return await checkCalendarConflicts(taskId, newDate, user.token, newStart, newEnd);
  }, [user?.token]);

  const rescheduleTaskWithConflictCheck = useCallback(async (
    taskId: string,
    newDate: string,
    newStart?: string,
    newEnd?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user?.token) {
        return {
          success: false,
          error: 'Authentication required to reschedule task',
        };
      }

      // First check for conflicts
      const conflictCheck = await checkConflicts(taskId, newDate, newStart, newEnd);
      if (conflictCheck.has_conflict) {
        return {
          success: false,
          error: conflictCheck.message || 'Scheduling conflict detected',
        };
      }

      // No conflicts, proceed with rescheduling
      await rescheduleTask(taskId, newDate, user.token, newStart, newEnd, reason);

      // Refresh tasks after successful rescheduling
      await refreshTasks();

      return { success: true };
    } catch (error) {
      console.error('Failed to reschedule task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reschedule task',
      };
    }
  }, [checkConflicts, refreshTasks, user?.token]);

  // Fetch tasks when dependencies change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    ...state,
    setCurrentDate,
    setViewMode,
    setFilters,
    refreshTasks,
    checkConflicts,
    rescheduleTaskWithConflictCheck,
  };
}
