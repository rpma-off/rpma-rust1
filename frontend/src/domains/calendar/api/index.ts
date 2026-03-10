/**
 * calendar Domain - Public API
 */

export { CalendarProvider, useCalendarDomainContext } from './CalendarProvider';
/** TODO: document */
export { useCalendar } from '../hooks/useCalendar';
/** TODO: document */
export type {
  CalendarViewMode,
  CalendarState,
  UseCalendarReturn,
} from '../hooks/useCalendar';

/** TODO: document */
export type { CalendarDomainContextValue } from './types';

// Store
/** TODO: document */
export { useCalendarStore } from '../stores/calendarStore';

// Hooks
/** TODO: document */
export { useCalendarEvents } from '../hooks/useCalendarEvents';

// IPC
/** TODO: document */
export {
  getCalendarTasks,
  checkCalendarConflicts,
  scheduleTask,
  rescheduleTask,
  createDateRange,
  createCalendarFilter,
} from '../ipc/calendar';

// Components
/** TODO: document */
export { CalendarHeader } from '../components/CalendarHeader';
/** TODO: document */
export { CalendarView } from '../components/CalendarView';
/** TODO: document */
export { MonthView } from '../components/MonthView';
/** TODO: document */
export { WeekView } from '../components/WeekView';
/** TODO: document */
export { DayView } from '../components/DayView';
/** TODO: document */
export { AgendaView } from '../components/AgendaView';
/** TODO: document */
export { CalendarFilters } from '../components/CalendarFilters';
/** TODO: document */
export { CalendarDashboard } from '../components/CalendarDashboard';
