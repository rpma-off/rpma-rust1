import { safeInvoke, extractAndValidate, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateTask, validateTaskListResponse } from '@/lib/validation/backend-type-guards';
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
  create: async (data: CreateTaskRequest, sessionToken: string): Promise<Task> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'Create', data },
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
    return extractAndValidate(result, validateTask) as Task;
  },

  get: (id: string, sessionToken: string): Promise<Task | null> =>
    cachedInvoke(`task:${id}`, IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'Get', id },
        session_token: sessionToken
      }
    }, (data: JsonValue) => extractAndValidate(data, validateTask, { handleNotFound: true }) as Task | null),

  update: async (id: string, data: UpdateTaskRequest, sessionToken: string): Promise<Task> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'Update', id, data },
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
    return extractAndValidate(result, validateTask) as Task;
  },

  list: (filters: Partial<TaskQuery>, sessionToken: string): Promise<TaskListResponse> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
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
    }).then(result => {
      const data = result as unknown as TaskListResponse;
      if (!validateTaskListResponse(data)) {
        throw new Error('Invalid response format for task list');
      }
      return data;
    }),

  delete: async (id: string, sessionToken: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'Delete', id },
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
  },

  statistics: (sessionToken: string): Promise<TaskStatistics> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'GetStatistics' },
        session_token: sessionToken
      }
    }).then(result => extractAndValidate(result) as TaskStatistics),

  checkTaskAssignment: (taskId: string, userId: string, sessionToken: string): Promise<TaskAssignmentCheckResponse> =>
    safeInvoke<TaskAssignmentCheckResponse>(IPC_COMMANDS.CHECK_TASK_ASSIGNMENT, {
      request: { task_id: taskId, user_id: userId, session_token: sessionToken }
    }),

  checkTaskAvailability: (taskId: string, sessionToken: string): Promise<TaskAvailabilityCheckResponse> =>
    safeInvoke<TaskAvailabilityCheckResponse>(IPC_COMMANDS.CHECK_TASK_AVAILABILITY, {
      request: { task_id: taskId, session_token: sessionToken }
    }),

  getTaskHistory: (taskId: string, sessionToken: string): Promise<TaskHistoryEntry[]> =>
    safeInvoke<TaskHistoryEntry[]>(IPC_COMMANDS.GET_TASK_HISTORY, {
      request: { task_id: taskId, session_token: sessionToken }
    }),

  validateTaskAssignmentChange: (
    taskId: string,
    oldUserId: string | null,
    newUserId: string,
    sessionToken: string
  ): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.VALIDATE_TASK_ASSIGNMENT_CHANGE, {
      request: { task_id: taskId, old_user_id: oldUserId, new_user_id: newUserId, session_token: sessionToken }
    }),

  editTask: async (taskId: string, updates: JsonObject, sessionToken: string): Promise<Task> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.EDIT_TASK, {
      request: {
        task_id: taskId,
        data: updates,
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
    return extractAndValidate(result, validateTask) as Task;
  },

  addTaskNote: async (taskId: string, note: string, sessionToken: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.ADD_TASK_NOTE, {
      request: {
        task_id: taskId,
        note,
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
  },

  sendTaskMessage: async (
    taskId: string,
    message: string,
    messageType: string,
    sessionToken: string
  ): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.SEND_TASK_MESSAGE, {
      request: {
        task_id: taskId,
        message,
        message_type: messageType,
        session_token: sessionToken
      }
    });
  },

  delayTask: async (taskId: string, newDate: string, reason: string, sessionToken: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.DELAY_TASK, {
      request: {
        task_id: taskId,
        new_scheduled_date: newDate,
        reason,
        session_token: sessionToken
      }
    });
    invalidatePattern('task:');
  },

  reportTaskIssue: async (
    taskId: string,
    issueType: string,
    severity: string,
    description: string,
    sessionToken: string
  ): Promise<void> => {
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

  exportTasksCsv: (
    options: { include_notes?: boolean; date_range?: { start_date?: string; end_date?: string } },
    sessionToken: string
  ): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.EXPORT_TASKS_CSV, {
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
    }),

  importTasksBulk: (
    options: { csv_lines: string[]; skip_duplicates?: boolean; update_existing?: boolean },
    sessionToken: string
  ): Promise<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }> =>
    safeInvoke<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }>(
      IPC_COMMANDS.IMPORT_TASKS_BULK,
      {
        request: {
          csv_data: options.csv_lines.join('\n'),
          update_existing: options.update_existing ?? false,
          session_token: sessionToken
        }
      }
    ),
};
