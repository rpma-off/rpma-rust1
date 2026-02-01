import { invoke } from '@tauri-apps/api/core';
import type {
  CalendarTask,
  CalendarFilter,
  ConflictDetection,
  CalendarDateRange,
} from '../backend';

// Calendar IPC command functions

export async function getCalendarTasks(filter: CalendarFilter): Promise<CalendarTask[]> {
  return await invoke('calendar_get_tasks', {
    filter,
  });
}

export async function checkCalendarConflicts(
  taskId: string,
  newDate: string,
  newStart?: string,
  newEnd?: string
): Promise<ConflictDetection> {
  return await invoke('calendar_check_conflicts', {
    taskId,
    newDate,
    newStart,
    newEnd,
  });
}

export async function rescheduleTask(
  taskId: string,
  newScheduledDate: string,
  newStartTime?: string,
  newEndTime?: string,
  reason?: string
): Promise<void> {
  return await invoke('task_reschedule', {
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