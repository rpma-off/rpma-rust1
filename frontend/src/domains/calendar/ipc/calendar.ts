import { safeInvoke } from '@/lib/ipc/utils';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type {
  CalendarTask,
  CalendarFilter,
  ConflictDetection,
  CalendarDateRange,
} from '@/lib/backend';

// Calendar IPC command functions

export async function getCalendarTasks(
  filter: CalendarFilter,
  sessionToken: string
): Promise<CalendarTask[]> {
  return await safeInvoke<CalendarTask[]>('calendar_get_tasks', {
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
  sessionToken: string,
  newStart?: string,
  newEnd?: string
): Promise<ConflictDetection> {
  return await safeInvoke<ConflictDetection>('calendar_check_conflicts', {
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
  sessionToken: string,
  newStart?: string,
  newEnd?: string,
  force?: boolean
): Promise<ConflictDetection> {
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
  sessionToken: string,
  newStartTime?: string,
  newEndTime?: string,
  reason?: string
): Promise<void> {
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
