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

  getTask: (taskId: string) => taskIpc.get(taskId),

  checkTaskAssignment: (taskId: string, userId: string): Promise<TaskAssignmentCheckResponse> =>
    taskIpc.checkTaskAssignment(taskId, userId),

  checkTaskAvailability: (taskId: string): Promise<TaskAvailabilityCheckResponse> =>
    taskIpc.checkTaskAvailability(taskId),

  getTaskHistory: (taskId: string): Promise<TaskHistoryEntry[]> =>
    taskIpc.getTaskHistory(taskId),

  editTask: (taskId: string, updates: JsonObject) =>
    taskIpc.editTask(taskId, updates),

  addTaskNote: (taskId: string, note: string) =>
    taskIpc.addTaskNote(taskId, note),

  sendTaskMessage: (taskId: string, message: string, messageType: string) =>
    taskIpc.sendTaskMessage(taskId, message, messageType),

  delayTask: (taskId: string, newDate: string, reason: string) =>
    taskIpc.delayTask(taskId, newDate, reason),

  reportTaskIssue: (
    taskId: string,
    issueType: string,
    severity: string,
    description: string,
  ) => taskIpc.reportTaskIssue(taskId, issueType, severity, description),

  transitionStatus: (request: StatusTransitionRequest) =>
    statusApi.transitionStatus(request),

  exportTasksCsv: (
    options: Parameters<typeof taskIpc.exportTasksCsv>[0],
  ) => taskIpc.exportTasksCsv(options),

  importTasksBulk: (
    options: Parameters<typeof taskIpc.importTasksBulk>[0],
  ) => taskIpc.importTasksBulk(options),
};
