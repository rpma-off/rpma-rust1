export { TaskService, taskService } from '../services/task.service';
export { taskIpc } from '../ipc/task.ipc';
export { taskApiService } from '../services';
export {
  generateUniqueTaskNumber,
  generateFallbackTaskNumber,
  isValidTaskNumberFormat,
} from '../utils/number-generator';
export { taskPhotoService } from '@/domains/documents';
export type { TaskPhotoQueryParams } from '@/domains/documents';

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string;
}
