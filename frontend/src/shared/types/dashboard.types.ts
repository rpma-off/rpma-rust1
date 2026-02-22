import { TaskStatus, TaskPriority } from '@/lib/backend';

/**
 * Priority levels for tasks
 */
export type Priority = TaskPriority;

/**
 * Dashboard Task Interface
 */
export interface DashboardTask {
  id: string;
  title: string;
  vehicle: string;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  zones: string[];
  technician?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    email?: string | null;
    initials: string;
  } | null;
  status: TaskStatus;
  priority: Priority;
  startTime: string | null;
  endTime: string | null;
  scheduledDate?: string | null;
  duration?: string | number | null;
  progress: number;
  checklistCompleted: boolean;
  photos?: {
    before: Array<{ id: string; url: string }>;
    after: Array<{ id: string; url: string }>;
  };
  customer_name?: string | null;
  createdAt?: string | null;
}
