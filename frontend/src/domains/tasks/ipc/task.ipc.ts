import { safeInvoke, extractAndValidate, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateTask, validateTaskListResponse } from '@/lib/validation/backend-type-guards';
import { requireSessionToken } from '@/shared/contracts/session';
import type { JsonObject, JsonValue } from '@/types/json';
import type {
  TaskAssignmentCheckResponse,
  TaskAvailabilityCheckResponse,
  TaskHistoryEntry,
} from '../api/types';
import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
  TaskStatistics,
  TaskQuery
} from '@/lib/backend';

export const taskIpc = {
  create: async (data: CreateTaskRequest): Promise<Task> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'Create', data },
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
    signalMutation('tasks');
    return extractAndValidate(result, validateTask) as Task;
  },

  get: async (id: string): Promise<Task | null> => {
    const sessionToken = await requireSessionToken();
    return cachedInvoke(`task:${id}`, IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'Get', id },
        session_token: sessionToken
      }
    }, (data: JsonValue) => extractAndValidate(data, validateTask, { handleNotFound: true }) as Task | null);
  },

  update: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'Update', id, data },
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
    signalMutation('tasks');
    return extractAndValidate(result, validateTask) as Task;
  },

  list: async (filters: Partial<TaskQuery>): Promise<TaskListResponse> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: {
          action: 'List',
          filters: {
            page: filters.page ?? 1,
            limit: filters.limit ?? 20,
            status: filters.status ?? null,
            technician_id: filters.technician_id ?? null,
            client_id: filters.client_id ?? null,
            priority: filters.priority ?? null,
            search: filters.search ?? null,
            from_date: filters.from_date ?? null,
            to_date: filters.to_date ?? null,
            sort_by: filters.sort_by ?? 'created_at',
            sort_order: filters.sort_order ?? 'desc'
          }
        },
        session_token: sessionToken
      }
    });
    const data = result as unknown as TaskListResponse;
    if (!validateTaskListResponse(data)) {
      throw new Error('Invalid response format for task list');
    }
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const sessionToken = await requireSessionToken();
    await safeInvoke<void>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'Delete', id },
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
    signalMutation('tasks');
  },

  statistics: async (): Promise<TaskStatistics> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'GetStatistics' },
        session_token: sessionToken
      }
    });
    return extractAndValidate(result) as TaskStatistics;
  },

  checkTaskAssignment: async (taskId: string, userId: string): Promise<TaskAssignmentCheckResponse> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<TaskAssignmentCheckResponse>(IPC_COMMANDS.CHECK_TASK_ASSIGNMENT, {
      request: { task_id: taskId, user_id: userId, session_token: sessionToken }
    });
  },

  checkTaskAvailability: async (taskId: string): Promise<TaskAvailabilityCheckResponse> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<TaskAvailabilityCheckResponse>(IPC_COMMANDS.CHECK_TASK_AVAILABILITY, {
      request: { task_id: taskId, session_token: sessionToken }
    });
  },

  getTaskHistory: async (taskId: string): Promise<TaskHistoryEntry[]> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<TaskHistoryEntry[]>(IPC_COMMANDS.GET_TASK_HISTORY, {
      request: { task_id: taskId, session_token: sessionToken }
    });
  },

  validateTaskAssignmentChange: async (
    taskId: string,
    oldUserId: string | null,
    newUserId: string
  ): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.VALIDATE_TASK_ASSIGNMENT_CHANGE, {
      request: { task_id: taskId, old_user_id: oldUserId, new_user_id: newUserId, session_token: sessionToken }
    });
  },

  editTask: async (taskId: string, updates: JsonObject): Promise<Task> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.EDIT_TASK, {
      request: {
        task_id: taskId,
        data: updates,
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
    signalMutation('tasks');
    return extractAndValidate(result, validateTask) as Task;
  },

  addTaskNote: async (taskId: string, note: string): Promise<void> => {
    const sessionToken = await requireSessionToken();
    await safeInvoke<void>(IPC_COMMANDS.ADD_TASK_NOTE, {
      request: {
        task_id: taskId,
        note,
        session_token: sessionToken
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
    const sessionToken = await requireSessionToken();
    await safeInvoke<void>(IPC_COMMANDS.SEND_TASK_MESSAGE, {
      request: {
        task_id: taskId,
        message,
        message_type: messageType,
        session_token: sessionToken
      }
    });
  },

  delayTask: async (taskId: string, newDate: string, reason: string): Promise<void> => {
    const sessionToken = await requireSessionToken();
    await safeInvoke<void>(IPC_COMMANDS.DELAY_TASK, {
      request: {
        task_id: taskId,
        new_scheduled_date: newDate,
        reason,
        session_token: sessionToken
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
    const sessionToken = await requireSessionToken();
    await safeInvoke<void>(IPC_COMMANDS.REPORT_TASK_ISSUE, {
      request: {
        task_id: taskId,
        issue_type: issueType,
        severity,
        description,
        session_token: sessionToken
      }
    });
  },

  exportTasksCsv: async (
    options: { include_notes?: boolean; date_range?: { start_date?: string; end_date?: string } }
  ): Promise<string> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<string>(IPC_COMMANDS.EXPORT_TASKS_CSV, {
      request: {
        include_client_data: options.include_notes ?? false,
        filter: options.date_range
          ? {
              date_from: options.date_range.start_date,
              date_to: options.date_range.end_date
            }
          : undefined,
        session_token: sessionToken
      }
    });
  },

  importTasksBulk: async (
    options: { csv_lines: string[]; skip_duplicates?: boolean; update_existing?: boolean }
  ): Promise<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }>(
      IPC_COMMANDS.IMPORT_TASKS_BULK,
      {
        request: {
          csv_data: options.csv_lines.join('\n'),
          update_existing: options.update_existing ?? false,
          session_token: sessionToken
        }
      }
    );
  },
};
