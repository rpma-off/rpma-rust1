import { safeInvoke, extractAndValidate } from '../core';
import { createCrudOperations } from '../utils/crud-helpers';
import { IPC_COMMANDS } from '../commands';
import { validateTask, validateTaskListResponse } from '@/lib/validation/backend-type-guards';
import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
  TaskStatistics,
  TaskQuery
} from '../types/index';

/**
 * Task management operations including CRUD and specialized task operations
 */

// Create the base CRUD operations using the generic helper
const taskCrud = createCrudOperations<
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  Partial<TaskQuery>,
  TaskListResponse
>(
  IPC_COMMANDS.TASK_CRUD,
  validateTask,
  'task'
);

// Specialized task operations
const specializedOperations = {
  /**
   * Retrieves task statistics
   * @param sessionToken - User's session token
   * @returns Promise resolving to task statistics
   */
  statistics: (sessionToken: string): Promise<TaskStatistics> =>
    safeInvoke<TaskStatistics>(IPC_COMMANDS.TASK_CRUD, {
      request: {
        action: { action: 'GetStatistics' },
        session_token: sessionToken
      }
    }),

  /**
   * Checks if a user can be assigned to a task
   * @param taskId - Task ID to check
   * @param userId - User ID to check assignment for
   * @param sessionToken - User's session token
   * @returns Promise resolving to assignment validation result
   */
  checkTaskAssignment: (taskId: string, userId: string, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.CHECK_TASK_ASSIGNMENT, {
      request: { task_id: taskId, user_id: userId, session_token: sessionToken }
    }),

  /**
   * Checks if a task is available for assignment
   * @param taskId - Task ID to check
   * @param sessionToken - User's session token
   * @returns Promise resolving to availability check result
   */
  checkTaskAvailability: (taskId: string, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.CHECK_TASK_AVAILABILITY, {
      request: { task_id: taskId, session_token: sessionToken }
    }),

  /**
   * Validates task assignment changes
   * @param taskId - Task ID
   * @param oldUserId - Previous user ID (if any)
   * @param newUserId - New user ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to validation result
   */
  validateTaskAssignmentChange: (
    taskId: string,
    oldUserId: string | null,
    newUserId: string,
    sessionToken: string
  ): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.VALIDATE_TASK_ASSIGNMENT_CHANGE, {
      request: { task_id: taskId, old_user_id: oldUserId, new_user_id: newUserId, session_token: sessionToken }
    }),

  /**
   * Edits a task with specific updates
   * @param taskId - Task ID to edit
   * @param updates - Task update data
   * @param sessionToken - User's session token
   * @returns Promise resolving to the updated task
   */
  editTask: async (taskId: string, updates: Record<string, unknown>, sessionToken: string): Promise<Task> => {
    const result = await safeInvoke<unknown>(IPC_COMMANDS.EDIT_TASK, {
      request: {
        task_id: taskId,
        data: updates,
        session_token: sessionToken
      }
    });
    return extractAndValidate(result, validateTask) as Task;
  },

  /**
   * Adds a note to a task
   * @param taskId - Task ID
   * @param note - Note content
   * @param sessionToken - User's session token
   * @returns Promise resolving when note is added
   */
  addTaskNote: async (taskId: string, note: string, sessionToken: string): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.ADD_TASK_NOTE, {
      request: {
        task_id: taskId,
        note,
        session_token: sessionToken
      }
    });
  },

  /**
   * Sends a message related to a task
   * @param taskId - Task ID
   * @param message - Message content
   * @param messageType - Type of message
   * @param sessionToken - User's session token
   * @returns Promise resolving when message is sent
   */
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

  /**
   * Delays a task to a new date
   * @param taskId - Task ID
   * @param newDate - New due date
   * @param reason - Reason for delay
   * @param sessionToken - User's session token
   * @returns Promise resolving when task is delayed
   */
  delayTask: async (
    taskId: string,
    newDate: string,
    reason: string,
    sessionToken: string
  ): Promise<void> => {
    await safeInvoke<void>(IPC_COMMANDS.DELAY_TASK, {
      request: {
        task_id: taskId,
        new_scheduled_date: newDate,
        reason,
        session_token: sessionToken
      }
    });
  },

  /**
   * Reports an issue with a task
   * @param taskId - Task ID
   * @param issueType - Type of issue
   * @param severity - Issue severity
   * @param description - Issue description
   * @param sessionToken - User's session token
   * @returns Promise resolving when issue is reported
   */
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

  /**
   * Exports tasks to CSV format
   * @param options - Export options
   * @param sessionToken - User's session token
   * @returns Promise resolving to CSV data string
   */
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

  /**
   * Imports tasks from CSV data
   * @param options - Import options with CSV lines
   * @param sessionToken - User's session token
   * @returns Promise resolving to import result
   */
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

/**
 * Combined task operations - CRUD + specialized operations
 */
export const taskOperations = {
  ...taskCrud,
  ...specializedOperations,
};
