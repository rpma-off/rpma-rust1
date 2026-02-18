/**
 * Tasks Domain - Public API
 */

export { TaskProvider } from './TaskProvider';
export { useTasks } from './useTasks';
export { useTaskActions } from './useTaskActions';
export { taskIpc } from '../ipc/task.ipc';
export { TaskService, taskService } from '../services/task.service';

export { KanbanBoard } from '../components/KanbanBoard';
export { TaskAttachments } from '../components/TaskAttachments';
export { TaskDetails } from '../components/TaskDetails';
export { TaskHistory } from '../components/TaskHistory';
export { default as TaskManager } from '../components/TaskManager';
export { TaskOverview } from '../components/TaskOverview';
export { TaskTimeline } from '../components/TaskTimeline';
export { WorkflowProgressCard } from '../components/WorkflowProgressCard';
export { ActionsCard, ActionButtons } from '../components/TaskActions';

export * from '../components/TaskForm';

export {
  useNormalizedTask,
  useNormalizedTasks,
  useCustomerInfo,
  usePPFConfiguration,
  useScheduleInfo,
  useCustomerDisplayName,
  useVehicleDisplayInfo,
  usePPFZonesList,
  useScheduleDisplay,
} from '../hooks/useNormalizedTask';

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
} from './types';
