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
export * from '../components';
