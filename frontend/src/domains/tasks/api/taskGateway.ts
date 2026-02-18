import { TaskService } from '../services/task.service';
import { taskIpc } from '../ipc/task.ipc';
import type { JsonObject } from '@/types/json';

const taskService = TaskService.getInstance();

export const taskGateway = {
  getTaskById: (taskId: string) => taskService.getTaskById(taskId),

  getTask: (taskId: string, sessionToken: string) => taskIpc.get(taskId, sessionToken),

  checkTaskAssignment: (taskId: string, userId: string, sessionToken: string) =>
    taskIpc.checkTaskAssignment(taskId, userId, sessionToken),

  checkTaskAvailability: (taskId: string, sessionToken: string) =>
    taskIpc.checkTaskAvailability(taskId, sessionToken),

  editTask: (taskId: string, updates: JsonObject, sessionToken: string) =>
    taskIpc.editTask(taskId, updates, sessionToken),

  exportTasksCsv: (
    options: Parameters<typeof taskIpc.exportTasksCsv>[0],
    sessionToken: string
  ) => taskIpc.exportTasksCsv(options, sessionToken),

  importTasksBulk: (
    options: Parameters<typeof taskIpc.importTasksBulk>[0],
    sessionToken: string
  ) => taskIpc.importTasksBulk(options, sessionToken),
};
