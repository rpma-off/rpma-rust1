import { ipcClient } from '@/lib/ipc/client';
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '@/types/calendar';

export class CalendarService {
  /**
   * Get events within a date range
   */
  async getEvents(startDate: string, endDate: string, technicianId: string | undefined, sessionToken: string): Promise<CalendarEvent[]> {
    return ipcClient.calendar.getEvents(startDate, endDate, technicianId, sessionToken) as Promise<CalendarEvent[]>;
  }

  /**
   * Get a single event by ID
   */
  async getEventById(id: string, sessionToken: string): Promise<CalendarEvent> {
    return ipcClient.calendar.getEventById(id, sessionToken) as Promise<CalendarEvent>;
  }

  /**
   * Create a new event
   */
  async createEvent(input: CreateEventInput, sessionToken: string): Promise<CalendarEvent> {
    return ipcClient.calendar.createEvent(input, sessionToken) as Promise<CalendarEvent>;
  }

  /**
   * Update an existing event
   */
  async updateEvent(id: string, input: UpdateEventInput, sessionToken: string): Promise<CalendarEvent> {
    return ipcClient.calendar.updateEvent(id, input, sessionToken) as Promise<CalendarEvent>;
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string, sessionToken: string): Promise<void> {
    return ipcClient.calendar.deleteEvent(id, sessionToken) as Promise<void>;
  }

  /**
   * Get events for a specific technician
   */
  async getEventsForTechnician(technicianId: string, sessionToken: string): Promise<CalendarEvent[]> {
    return ipcClient.calendar.getEventsForTechnician(technicianId, sessionToken) as Promise<CalendarEvent[]>;
  }

  /**
   * Get events linked to a specific task
   */
  async getEventsForTask(taskId: string, sessionToken: string): Promise<CalendarEvent[]> {
    return ipcClient.calendar.getEventsForTask(taskId, sessionToken) as Promise<CalendarEvent[]>;
  }
}

export const calendarService = new CalendarService();
