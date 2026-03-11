import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { requireSessionToken } from '@/shared/contracts/session';
import type {
  CalendarTask,
  CalendarFilter,
  ConflictDetection,
  CalendarDateRange,
} from '@/lib/backend';
import type { CreateEventInput, UpdateEventInput } from '@/lib/ipc/types/index';
import type { JsonValue } from '@/types/json';

// Calendar IPC command functions
// Backend handlers for calendar commands embed session_token inside their `request`
// struct, so we fetch it with requireSessionToken() and inject it explicitly there.

export async function getCalendarTasks(
  filter: CalendarFilter
): Promise<CalendarTask[]> {
  const sessionToken = await requireSessionToken();
  return await safeInvoke<CalendarTask[]>(IPC_COMMANDS.CALENDAR_GET_TASKS, {
    request: {
      session_token: sessionToken,
      date_range: filter.date_range,
      technician_ids: filter.technician_ids,
      statuses: filter.statuses,
    },
  });
}

export async function checkCalendarConflicts(
  taskId: string,
  newDate: string,
  newStart?: string,
  newEnd?: string
): Promise<ConflictDetection> {
  const sessionToken = await requireSessionToken();
  return await safeInvoke<ConflictDetection>(IPC_COMMANDS.CALENDAR_CHECK_CONFLICTS, {
    request: {
      session_token: sessionToken,
      task_id: taskId,
      new_date: newDate,
      new_start: newStart,
      new_end: newEnd,
    },
  });
}

/**
 * Schedule a task atomically - checks conflicts and updates both
 * tasks.scheduled_date and calendar_events in a single transaction.
 * Returns ConflictDetection: if has_conflict is true, scheduling was blocked.
 */
export async function scheduleTask(
  taskId: string,
  newDate: string,
  newStart?: string,
  newEnd?: string,
  force?: boolean
): Promise<ConflictDetection> {
  const sessionToken = await requireSessionToken();
  return await safeInvoke<ConflictDetection>(IPC_COMMANDS.CALENDAR_SCHEDULE_TASK, {
    request: {
      session_token: sessionToken,
      task_id: taskId,
      new_date: newDate,
      new_start: newStart,
      new_end: newEnd,
      force: force ?? false,
    },
  });
}

export async function rescheduleTask(
  taskId: string,
  newScheduledDate: string,
  newStartTime?: string,
  newEndTime?: string,
  reason?: string
): Promise<void> {
  const sessionToken = await requireSessionToken();
  // Backend supports delay_task with scheduled date and reason only.
  await safeInvoke<void>(IPC_COMMANDS.DELAY_TASK, {
    request: {
      task_id: taskId,
      new_scheduled_date: newScheduledDate,
      reason: reason ?? '',
      session_token: sessionToken
    }
  });
}

// Utility functions for calendar operations

export function createDateRange(startDate: Date | string, endDate: Date | string): CalendarDateRange {
  return {
    start_date: startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate,
    end_date: endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate,
  };
}

export function createCalendarFilter(
  startDate: Date | string,
  endDate: Date | string,
  technicianIds?: string[],
  statuses?: string[]
): CalendarFilter {
  return {
    date_range: createDateRange(startDate, endDate),
    technician_ids: technicianIds || null,
    statuses: statuses || null,
  };
}

export const calendarEvents = {
  getEvents: async (
    startDate: string,
    endDate: string,
    technicianId: string | undefined,
  ): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENTS, {
      start_date: startDate,
      end_date: endDate,
      technician_id: technicianId,
      session_token: sessionToken
    });
  },

  getEventById: async (id: string): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENT_BY_ID, {
      request: { id, session_token: sessionToken },
    });
  },

  createEvent: async (eventData: CreateEventInput): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.CREATE_EVENT, {
      request: { event_data: eventData, session_token: sessionToken },
    });
  },

  updateEvent: async (id: string, eventData: UpdateEventInput): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_EVENT, {
      request: { id, event_data: eventData, session_token: sessionToken },
    });
  },

  deleteEvent: async (id: string): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.DELETE_EVENT, {
      request: { id, session_token: sessionToken },
    });
  },

  getEventsForTechnician: async (technicianId: string): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENTS_FOR_TECHNICIAN, {
      request: { technician_id: technicianId, session_token: sessionToken },
    });
  },

  getEventsForTask: async (taskId: string): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENTS_FOR_TASK, {
      request: { task_id: taskId, session_token: sessionToken },
    });
  },
};
