import { ipcClient } from '@/lib/ipc';
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  Task,
  TaskListResponse,
  TaskStatistics,
  TaskQuery,
} from '@/lib/backend';
import type { JsonObject, JsonValue } from '@/types/json';

export const taskIpc = {
  create: (data: CreateTaskRequest, sessionToken: string): Promise<Task> =>
    ipcClient.tasks.create(data, sessionToken),

  get: (id: string, sessionToken: string): Promise<Task | null> =>
    ipcClient.tasks.get(id, sessionToken),

  update: (id: string, data: UpdateTaskRequest, sessionToken: string): Promise<Task> =>
    ipcClient.tasks.update(id, data, sessionToken),

  list: (filters: Partial<TaskQuery>, sessionToken: string): Promise<TaskListResponse> =>
    ipcClient.tasks.list(filters, sessionToken),

  delete: (id: string, sessionToken: string): Promise<void> =>
    ipcClient.tasks.delete(id, sessionToken),

  statistics: (sessionToken: string): Promise<TaskStatistics> =>
    ipcClient.tasks.statistics(sessionToken),

  checkTaskAssignment: (taskId: string, userId: string, sessionToken: string): Promise<JsonValue> =>
    ipcClient.tasks.checkTaskAssignment(taskId, userId, sessionToken),

  checkTaskAvailability: (taskId: string, sessionToken: string): Promise<JsonValue> =>
    ipcClient.tasks.checkTaskAvailability(taskId, sessionToken),

  validateTaskAssignmentChange: (
    taskId: string,
    oldUserId: string | null,
    newUserId: string,
    sessionToken: string
  ): Promise<JsonValue> =>
    ipcClient.tasks.validateTaskAssignmentChange(taskId, oldUserId, newUserId, sessionToken),

  editTask: (taskId: string, updates: JsonObject, sessionToken: string): Promise<Task> =>
    ipcClient.tasks.editTask(taskId, updates, sessionToken),

  addTaskNote: (taskId: string, note: string, sessionToken: string): Promise<void> =>
    ipcClient.tasks.addTaskNote(taskId, note, sessionToken),

  sendTaskMessage: (
    taskId: string,
    message: string,
    messageType: string,
    sessionToken: string
  ): Promise<void> =>
    ipcClient.tasks.sendTaskMessage(taskId, message, messageType, sessionToken),

  delayTask: (taskId: string, newDate: string, reason: string, sessionToken: string): Promise<void> =>
    ipcClient.tasks.delayTask(taskId, newDate, reason, sessionToken),

  reportTaskIssue: (
    taskId: string,
    issueType: string,
    severity: string,
    description: string,
    sessionToken: string
  ): Promise<void> =>
    ipcClient.tasks.reportTaskIssue(taskId, issueType, severity, description, sessionToken),

  exportTasksCsv: (
    options: { include_notes?: boolean; date_range?: { start_date?: string; end_date?: string } },
    sessionToken: string
  ): Promise<string> =>
    ipcClient.tasks.exportTasksCsv(options, sessionToken),

  importTasksBulk: (
    options: { csv_lines: string[]; skip_duplicates?: boolean; update_existing?: boolean },
    sessionToken: string
  ): Promise<{ total_processed: number; successful: number; failed: number; errors: string[]; duplicates_skipped: number }> =>
    ipcClient.tasks.importTasksBulk(options, sessionToken),
};
