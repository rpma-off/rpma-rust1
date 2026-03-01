/**
 * calendar Domain - Public API
 */

export { CalendarProvider, useCalendarDomainContext } from './CalendarProvider';
export { useCalendar } from '../hooks/useCalendar';
export type {
  CalendarViewMode,
  CalendarState,
  UseCalendarReturn,
} from '../hooks/useCalendar';

export type { CalendarDomainContextValue } from './types';

// Store
export { useCalendarStore } from '../stores/calendarStore';

// Hooks
export { useCalendarEvents } from '../hooks/useCalendarEvents';

// IPC
export {
  getCalendarTasks,
  checkCalendarConflicts,
  scheduleTask,
  rescheduleTask,
  createDateRange,
  createCalendarFilter,
} from '../ipc/calendar';

// Components
export { CalendarHeader } from '../components/CalendarHeader';
export { CalendarView } from '../components/CalendarView';
export { MonthView } from '../components/MonthView';
export { WeekView } from '../components/WeekView';
export { DayView } from '../components/DayView';
export { AgendaView } from '../components/AgendaView';
export { CalendarFilters } from '../components/CalendarFilters';
export { CalendarDashboard } from '../components/CalendarDashboard';
