export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskWithDetails,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatistics,
  TaskQuery,
  TaskListResponse,
} from '@/types/task.types';

export type TaskAssignmentStatus = 'assigned' | 'available' | 'restricted' | 'unavailable';
export type TaskAvailabilityStatus =
  | 'available'
  | 'unavailable'
  | 'locked'
  | 'scheduled_conflict'
  | 'material_unavailable';

export interface TaskAssignmentCheckResponse {
  task_id: string;
  user_id: string;
  status: TaskAssignmentStatus;
  reason?: string | null;
}

export interface TaskAvailabilityCheckResponse {
  task_id: string;
  status: TaskAvailabilityStatus;
  reason?: string | null;
}

export interface TaskHistoryEntry {
  id: string;
  task_id: string;
  old_status?: string | null;
  new_status: string;
  reason?: string | null;
  changed_at: number | string;
  changed_by?: string | null;
}
