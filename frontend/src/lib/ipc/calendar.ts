import { invoke } from '@tauri-apps/api/core';
import { safeInvoke } from './utils';
import type {
  CalendarTask,
  CalendarFilter,
  ConflictDetection,
  CalendarDateRange,
} from '../backend';

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
  newStart?: string,
  newEnd?: string,
  sessionToken: string
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

export async function rescheduleTask(
  taskId: string,
  newScheduledDate: string,
  newStartTime?: string,
  newEndTime?: string,
  reason?: string,
  sessionToken: string
): Promise<void> {
  return await invoke('task_reschedule', {
    session_token: sessionToken,
    taskId,
    newScheduledDate,
    newStartTime,
    newEndTime,
    reason,
  });
}

export async function getTechnicianAvailability(
  technicianId: string,
  date: string
): Promise<{ availableSlots: Array<{ start: string; end: string; isAvailable: boolean }> }> {
  return await invoke('calendar_get_technician_availability', {
    technicianId,
    date,
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
