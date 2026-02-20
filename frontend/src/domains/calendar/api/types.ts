import type { CalendarViewMode } from '../hooks/useCalendar';

export interface CalendarDomainContextValue {
  domain: 'calendar';
  defaultView: CalendarViewMode;
}
