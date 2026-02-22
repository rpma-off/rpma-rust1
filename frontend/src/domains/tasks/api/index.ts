/**
 * Tasks Domain - Public API
 */

export { TaskProvider } from './TaskProvider';
export { useTasks } from './useTasks';
export { useTaskActions } from './useTaskActions';
export { taskService, taskApiService, taskPhotoService } from '../server';

export { KanbanBoard } from '../components/KanbanBoard';
export { TaskAttachments } from '../components/TaskAttachments';
export { TaskDetails } from '../components/TaskDetails';
export { TaskHistory } from '../components/TaskHistory';
export { default as TaskManager } from '../components/TaskManager';
export { TaskOverview } from '../components/TaskOverview';
export { TaskTimeline } from '../components/TaskTimeline';
export { WorkflowProgressCard } from '../components/WorkflowProgressCard';
export { ActionsCard, ActionButtons } from '../components/TaskActions';
export { QuickAddDialog } from '../components/QuickAddDialog';
export { FilterDrawer } from '../components/FilterDrawer';

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
export { useTaskSync } from '../hooks/useTaskSync';
export { useTaskStatus } from '../hooks/useTaskStatus';
export { useTaskState } from '../hooks/useTaskState';
export { useTaskFilters } from '../hooks/useTaskFilters';
export { useTaskFiltering } from '../hooks/useTaskFiltering';
export { useWorkflowStepAutoSave } from '../hooks/useWorkflowStepAutoSave';
export { taskGateway } from './taskGateway';

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
export type { UpdateTaskData, TaskPhotoQueryParams } from '../server';

export {
  WorkflowService,
  workflowService,
  WorkflowTemplatesService,
  workflowTemplatesService,
  TaskWorkflowSyncService,
  taskWorkflowSyncService,
} from '../services';
export type {
  WorkflowExecution,
  WorkflowExecutionStep,
  CreateWorkflowExecutionDTO,
  StartTimingDTO,
  SignatureDTO,
  WorkflowTemplate,
  WorkflowStepTemplate,
  SOPInstruction,
} from '../services';
