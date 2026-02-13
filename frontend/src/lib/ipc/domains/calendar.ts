import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { CreateEventInput, UpdateEventInput } from '../types/index';
import type { JsonValue } from '@/types/json';

/**
 * Calendar and event management operations
 */
export const calendarOperations = {
  /**
   * Gets events within a date range
   * @param startDate - Start date for the range
   * @param endDate - End date for the range
   * @param technicianId - Optional technician ID to filter by
   * @param sessionToken - User's session token
   * @returns Promise resolving to events in the date range
   */
  getEvents: (
    startDate: string,
    endDate: string,
    technicianId: string | undefined,
    sessionToken: string
  ): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENTS, {
      start_date: startDate,
      end_date: endDate,
      technician_id: technicianId,
      session_token: sessionToken
    }),

  /**
   * Gets a specific event by ID
   * @param id - Event ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to event data
   */
  getEventById: (id: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENT_BY_ID, {
      id,
      session_token: sessionToken
    }),

  /**
   * Creates a new calendar event
   * @param eventData - Event creation data
   * @param sessionToken - User's session token
   * @returns Promise resolving to created event
   */
  createEvent: (eventData: CreateEventInput, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CREATE_EVENT, {
      event_data: eventData,
      session_token: sessionToken
    }),

  /**
   * Updates an existing calendar event
   * @param id - Event ID
   * @param eventData - Event update data
   * @param sessionToken - User's session token
   * @returns Promise resolving to updated event
   */
  updateEvent: (id: string, eventData: UpdateEventInput, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_EVENT, {
      id,
      event_data: eventData,
      session_token: sessionToken
    }),

  /**
   * Deletes a calendar event
   * @param id - Event ID to delete
   * @param sessionToken - User's session token
   * @returns Promise resolving when event is deleted
   */
  deleteEvent: (id: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.DELETE_EVENT, {
      id,
      session_token: sessionToken
    }),

  /**
   * Gets events for a specific technician
   * @param technicianId - Technician ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to technician's events
   */
  getEventsForTechnician: (technicianId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENTS_FOR_TECHNICIAN, {
      technician_id: technicianId,
      session_token: sessionToken
    }),

  /**
   * Gets events associated with a specific task
   * @param taskId - Task ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to task's events
   */
  getEventsForTask: (taskId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENTS_FOR_TASK, {
      task_id: taskId,
      session_token: sessionToken
    }),
};
