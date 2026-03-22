import { safeInvoke, extractAndValidate, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateTask, validateTaskListResponse } from '@/lib/validation/backend-type-guards';
import type {
  Task,
  ChecklistItem,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
  TaskStatistics,
  TaskQuery
} from '@/lib/backend';
import type { JsonObject, JsonValue } from '@/types/json';
import type {
  TaskAssignmentCheckResponse,
  TaskAvailabilityCheckResponse,
  TaskHistoryEntry,
} from '../api/types';

export const taskIpc = {
  create: async (data: CreateTaskRequest): Promise<Task> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CREATE, {
      data,
    });
    invalidatePattern('task:');
    signalMutation('tasks');
    return extractAndValidate(result, validateTask) as Task;
  },

  get: async (id: string): Promise<Task | null> => {
    return cachedInvoke(`task:${id}`, IPC_COMMANDS.TASK_GET, {
      id,
    }, (data: JsonValue) => extractAndValidate(data, validateTask, { handleNotFound: true }) as Task | null);
  },

  update: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_UPDATE, {
      id,
      data,
    });
    invalidatePattern('task:');
    signalMutation('tasks');
    return extractAndValidate(result, validateTask) as Task;
  },

  list: async (filters: Partial<TaskQuery>): Promise<TaskListResponse> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_LIST, {
      filter: {
        assigned_to: filters.technician_id ?? null,
        client_id: filters.client_id ?? null,
        status: filters.status ?? null,
        priority: filters.priority ?? null,
        region: null,
        include_completed: false,
        date_from: filters.from_date ?? null,
        date_to: filters.to_date ?? null,
      },
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    });
    const data = result as unknown as TaskListResponse;
    if (!validateTaskListResponse(data)) {
      throw new Error('Invalid response format for task list');
    }
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.TASK_DELETE, {
      id,
    });
    invalidatePattern('task:');
    signalMutation('tasks');
  },

  statistics: async (): Promise<TaskStatistics> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_STATISTICS, {});
    return extractAndValidate(result) as TaskStatistics;
  },

  checkTaskAssignment: async (taskId: string, userId: string): Promise<TaskAssignmentCheckResponse> => {
    return safeInvoke<TaskAssignmentCheckResponse>(IPC_COMMANDS.CHECK_TASK_ASSIGNMENT, {
      request: { task_id: taskId, user_id: userId }
    });
  },

  checkTaskAvailability: async (taskId: string): Promise<TaskAvailabilityCheckResponse> => {
    return safeInvoke<TaskAvailabilityCheckResponse>(IPC_COMMANDS.CHECK_TASK_AVAILABILITY, {
      request: { task_id: taskId }
    });
  },

  getTaskHistory: async (taskId: string): Promise<TaskHistoryEntry[]> => {
    return safeInvoke<TaskHistoryEntry[]>(IPC_COMMANDS.GET_TASK_HISTORY, {
      request: { task_id: taskId }
    });
  },

  editTask: async (taskId: string, updates: JsonObject): Promise<Task> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.EDIT_TASK, {
      request: {
        task_id: taskId,
        data: updates
      }
    });
    invalidatePattern('task:');
    signalMutation('tasks');
    return extractAndValidate(result, validateTask) as Task;
  },

  addTaskNote: async (taskId: string, note: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.ADD_TASK_NOTE, {
      request: {
        task_id: taskId,
        note
      }
    });
    invalidatePattern('task:');
    signalMutation('tasks');
  },

  sendTaskMessage: async (
    taskId: string,
    message: string,
    messageType: string
  ): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.SEND_TASK_MESSAGE, {
      request: {
        task_id: taskId,
        message,
        message_type: messageType
      }
    });
  },

  delayTask: async (taskId: string, newDate: string, reason: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.DELAY_TASK, {
      request: {
        task_id: taskId,
        new_scheduled_date: newDate,
        reason
      }
    });
    invalidatePattern('task:');
    signalMutation('tasks');
  },

  reportTaskIssue: async (
    taskId: string,
    issueType: string,
    severity: string,
    description: string
  ): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.REPORT_TASK_ISSUE, {
      request: {
        task_id: taskId,
        issue_type: issueType,
        severity,
        description
      }
    });
  },

  exportTasksCsv: async (
    options: { include_notes?: boolean; date_range?: { start_date?: string; end_date?: string } }
  ): Promise<string> => {
    return safeInvoke<string>(IPC_COMMANDS.EXPORT_TASKS_CSV, {
      request: {
        include_client_data: options.include_notes ?? false,
        filter: options.date_range
          ? {
              date_from: options.date_range.start_date,
              date_to: options.date_range.end_date
            }
          : undefined
      }
    });
  },

  importTasksBulk: async (
    options: { csv_lines: string[]; skip_duplicates?: boolean; update_existing?: boolean }
  ): Promise<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }> => {
    return safeInvoke<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }>(
      IPC_COMMANDS.IMPORT_TASKS_BULK,
      {
        request: {
          csv_data: options.csv_lines.join('\n'),
          update_existing: options.update_existing ?? false
        }
      }
    );
  },

  checklistItemsGet: async (taskId: string): Promise<ChecklistItem[]> => {
    return safeInvoke<ChecklistItem[]>(IPC_COMMANDS.TASK_CHECKLIST_ITEMS_GET, {
      task_id: taskId,
    });
  },

  checklistItemUpdate: async (
    itemId: string,
    taskId: string,
    data: { is_completed: boolean; notes?: string }
  ): Promise<ChecklistItem> => {
    return safeInvoke<ChecklistItem>(IPC_COMMANDS.TASK_CHECKLIST_ITEM_UPDATE, {
      item_id: itemId,
      task_id: taskId,
      data,
    });
  },

  checklistItemCreate: async (
    taskId: string,
    description: string,
    position?: number
  ): Promise<ChecklistItem> => {
    return safeInvoke<ChecklistItem>(IPC_COMMANDS.TASK_CHECKLIST_ITEM_CREATE, {
      data: { task_id: taskId, description, position: position ?? null },
    });
  },

  draftSave: async (formData: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.TASK_DRAFT_SAVE, { request: { form_data: formData } });
  },

  draftGet: async (): Promise<string | null> => {
    return safeInvoke<string | null>(IPC_COMMANDS.TASK_DRAFT_GET, { request: {} });
  },

  draftDelete: async (): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.TASK_DRAFT_DELETE, { request: {} });
  },
};
