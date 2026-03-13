import { safeInvoke } from '@/lib/ipc/core';
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '@/types/calendar';
import type { JsonObject } from '@/types/json';

export const calendarIpc = {
  getEvents: (startDate: string, endDate: string, technicianId?: string): Promise<CalendarEvent[]> =>
    safeInvoke<CalendarEvent[]>('get_events', {
      start_date: startDate,
      end_date: endDate,
      technician_id: technicianId
    }),

  getEventById: (id: string): Promise<CalendarEvent | null> =>
    safeInvoke<CalendarEvent | null>('get_event_by_id', { request: { id } }),

  createEvent: (eventData: CreateEventInput): Promise<CalendarEvent> =>
    safeInvoke<CalendarEvent>('create_event', { request: { event_data: eventData as unknown as JsonObject } }),

  updateEvent: (id: string, eventData: UpdateEventInput): Promise<CalendarEvent> =>
    safeInvoke<CalendarEvent>('update_event', { request: { id, event_data: eventData as unknown as JsonObject } }),

  deleteEvent: (id: string): Promise<void> =>
    safeInvoke<void>('delete_event', { request: { id } }),

  getEventsForTechnician: (technicianId: string): Promise<CalendarEvent[]> =>
    safeInvoke<CalendarEvent[]>('get_events_for_technician', { request: { technician_id: technicianId } }),

  getEventsForTask: (taskId: string): Promise<CalendarEvent[]> =>
    safeInvoke<CalendarEvent[]>('get_events_for_task', { request: { task_id: taskId } }),
};
