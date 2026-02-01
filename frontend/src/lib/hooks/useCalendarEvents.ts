import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { useAuth } from '@/lib/auth/compatibility';
import { getCalendarTasks } from '@/lib/ipc/calendar';
import type { CalendarTask, CalendarFilter } from '@/lib/backend';
import { useCalendarStore } from '@/lib/stores/calendarStore';

export function useCalendarEvents() {
  const { user } = useAuth();
  const { currentDate, filters } = useCalendarStore();
  const queryClient = useQueryClient();

  const dateRange = React.useMemo(() => {
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 1));
    
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  }, [currentDate]);

  const calendarFilter = React.useMemo(() => {
    return {
      date_range: {
        start_date: dateRange.start,
        end_date: dateRange.end,
      },
      technician_ids: filters.technicianId ? [filters.technicianId] : null,
      statuses: filters.statuses.length > 0 ? filters.statuses : null,
    };
  }, [dateRange, filters]);

  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['calendar-events', calendarFilter],
    queryFn: async () => {
      return await getCalendarTasks(calendarFilter);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    enabled: !!user?.token,
  });

  const filteredEvents = React.useMemo(() => {
    let result = events;
    
    // intervention_type filter not available on CalendarTask, filtering disabled for now
    
    if (filters.clientId) {
      result = result.filter(event => event.client_id === filters.clientId);
    }
    
    if (filters.dateRange) {
      const start = format(filters.dateRange.start, 'yyyy-MM-dd');
      const end = format(filters.dateRange.end, 'yyyy-MM-dd');
      result = result.filter(event => 
        event.scheduled_date >= start && event.scheduled_date <= end
      );
    }
    
    return result;
  }, [events, filters]);

  return {
    events: filteredEvents,
    isLoading,
    error,
    refetch,
    dateRange,
  };
}
