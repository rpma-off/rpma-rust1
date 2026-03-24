import { safeInvoke, invalidatePattern } from "@/lib/ipc/core";
import { signalMutation } from "@/lib/data-freshness";
import { IPC_COMMANDS } from "@/lib/ipc/commands";
import type {
  CalendarTask,
  CalendarFilter,
  ConflictDetection,
  CalendarDateRange,
} from "@/lib/backend";
import type { CreateEventInput, UpdateEventInput } from "@/lib/ipc/types/index";
import type { JsonObject, JsonValue } from "@/types/json";

const compactJsonObject = (
  value: Record<string, JsonValue | undefined>,
): JsonObject => {
  const entries = Object.entries(value).filter(
    ([, fieldValue]) => fieldValue !== undefined,
  ) as Array<[string, JsonValue]>;
  return Object.fromEntries(entries);
};

// Calendar IPC command functions

export async function getCalendarTasks(
  filter: CalendarFilter,
): Promise<CalendarTask[]> {
  return await safeInvoke<CalendarTask[]>(IPC_COMMANDS.CALENDAR_GET_TASKS, {
    request: {
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
  newEnd?: string,
): Promise<ConflictDetection> {
  return await safeInvoke<ConflictDetection>(
    IPC_COMMANDS.CALENDAR_CHECK_CONFLICTS,
    {
      request: compactJsonObject({
        task_id: taskId,
        new_date: newDate,
        new_start: newStart,
        new_end: newEnd,
      }),
    },
  );
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
  force?: boolean,
): Promise<ConflictDetection> {
  const result = await safeInvoke<ConflictDetection>(
    IPC_COMMANDS.CALENDAR_SCHEDULE_TASK,
    {
      request: compactJsonObject({
        task_id: taskId,
        new_date: newDate,
        new_start: newStart,
        new_end: newEnd,
        force: force ?? false,
      }),
    },
  );
  invalidatePattern("task:");
  invalidatePattern("calendar:");
  signalMutation("tasks");
  return result;
}

export async function rescheduleTask(
  taskId: string,
  newScheduledDate: string,
  newStartTime?: string,
  newEndTime?: string,
  reason?: string,
): Promise<void> {
  // Backend supports delay_task with scheduled date and reason only.
  await safeInvoke<void>(IPC_COMMANDS.DELAY_TASK, {
    request: {
      task_id: taskId,
      new_scheduled_date: newScheduledDate,
      reason: reason ?? "",
    },
  });
  invalidatePattern("task:");
  invalidatePattern("calendar:");
  signalMutation("tasks");
}

// Utility functions for calendar operations

export function createDateRange(
  startDate: Date | string,
  endDate: Date | string,
): CalendarDateRange {
  return {
    start_date:
      startDate instanceof Date
        ? (startDate.toISOString().split("T")[0] ?? "")
        : startDate,
    end_date:
      endDate instanceof Date
        ? (endDate.toISOString().split("T")[0] ?? "")
        : endDate,
  };
}

export function createCalendarFilter(
  startDate: Date | string,
  endDate: Date | string,
  technicianIds?: string[],
  statuses?: string[],
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
    return safeInvoke<JsonValue>(
      IPC_COMMANDS.GET_EVENTS,
      compactJsonObject({
        start_date: startDate,
        end_date: endDate,
        technician_id: technicianId,
      }),
    );
  },

  getEventById: async (id: string): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENT_BY_ID, {
      request: { id },
    });
  },

  createEvent: async (eventData: CreateEventInput): Promise<JsonValue> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.CREATE_EVENT, {
      request: { event_data: eventData },
    });
    invalidatePattern("calendar:");
    signalMutation("calendar");
    return result;
  },

  updateEvent: async (
    id: string,
    eventData: UpdateEventInput,
  ): Promise<JsonValue> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_EVENT, {
      request: { id, event_data: eventData },
    });
    invalidatePattern("calendar:");
    signalMutation("calendar");
    return result;
  },

  deleteEvent: async (id: string): Promise<JsonValue> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.DELETE_EVENT, {
      request: { id },
    });
    invalidatePattern("calendar:");
    signalMutation("calendar");
    return result;
  },

  getEventsForTechnician: async (technicianId: string): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENTS_FOR_TECHNICIAN, {
      request: { technician_id: technicianId },
    });
  },

  getEventsForTask: async (taskId: string): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.GET_EVENTS_FOR_TASK, {
      request: { task_id: taskId },
    });
  },
};
