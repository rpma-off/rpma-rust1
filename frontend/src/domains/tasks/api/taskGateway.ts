import { TaskService } from '../services/task.service';
import { taskIpc } from '../ipc/task.ipc';
import { statusApi } from '@/lib/ipc/status';
import type { JsonObject } from '@/types/json';
import type { StatusTransitionRequest } from '@/lib/backend';
import type {
  TaskAssignmentCheckResponse,
  TaskAvailabilityCheckResponse,
  TaskHistoryEntry,
} from './types';

const taskService = TaskService.getInstance();

export const taskGateway = {
  getTaskById: (taskId: string) => taskService.getTaskById(taskId),

  getTask: (taskId: string, sessionToken: string) => taskIpc.get(taskId, sessionToken),

  checkTaskAssignment: (taskId: string, userId: string, sessionToken: string): Promise<TaskAssignmentCheckResponse> =>
    taskIpc.checkTaskAssignment(taskId, userId, sessionToken),

  checkTaskAvailability: (taskId: string, sessionToken: string): Promise<TaskAvailabilityCheckResponse> =>
    taskIpc.checkTaskAvailability(taskId, sessionToken),

  getTaskHistory: (taskId: string, sessionToken: string): Promise<TaskHistoryEntry[]> =>
    taskIpc.getTaskHistory(taskId, sessionToken),

  editTask: (taskId: string, updates: JsonObject, sessionToken: string) =>
    taskIpc.editTask(taskId, updates, sessionToken),

  addTaskNote: (taskId: string, note: string, sessionToken: string) =>
    taskIpc.addTaskNote(taskId, note, sessionToken),

  sendTaskMessage: (taskId: string, message: string, messageType: string, sessionToken: string) =>
    taskIpc.sendTaskMessage(taskId, message, messageType, sessionToken),

  delayTask: (taskId: string, newDate: string, reason: string, sessionToken: string) =>
    taskIpc.delayTask(taskId, newDate, reason, sessionToken),

  reportTaskIssue: (
    taskId: string,
    issueType: string,
    severity: string,
    description: string,
    sessionToken: string
  ) => taskIpc.reportTaskIssue(taskId, issueType, severity, description, sessionToken),

  transitionStatus: (request: StatusTransitionRequest, sessionToken: string) =>
    statusApi.transitionStatus(request, sessionToken),

  exportTasksCsv: (
    options: Parameters<typeof taskIpc.exportTasksCsv>[0],
    sessionToken: string
  ) => taskIpc.exportTasksCsv(options, sessionToken),

  importTasksBulk: (
    options: Parameters<typeof taskIpc.importTasksBulk>[0],
    sessionToken: string
  ) => taskIpc.importTasksBulk(options, sessionToken),
};
