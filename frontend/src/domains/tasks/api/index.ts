/**
 * Tasks Domain - Public API
 */

export { TaskProvider } from './TaskProvider';
/** TODO: document */
export { useTasks } from './useTasks';
/** TODO: document */
export { useTaskActions } from './useTaskActions';
/** TODO: document */
export { taskService, taskApiService, taskPhotoService } from '../server';
/** TODO: document */
export { taskIpc } from '../ipc';
/** TODO: document */
export { default as TasksPageContent } from '../components/TasksPageContent';

/** TODO: document */
export { KanbanBoard } from '../components/KanbanBoard';
/** TODO: document */
export { TaskAttachments } from '../components/TaskAttachments';
/** TODO: document */
export { TaskDetails } from '../components/TaskDetails';
/** TODO: document */
export { TaskHistory } from '../components/TaskHistory';
/** TODO: document */
export { default as TaskManager } from '../components/TaskManager';
/** TODO: document */
export { TaskOverview } from '../components/TaskOverview';
/** TODO: document */
export { TaskTimeline } from '../components/TaskTimeline';
/** TODO: document */
export { WorkflowProgressCard } from '../components/WorkflowProgressCard';
/** TODO: document */
export { ActionsCard, ActionButtons } from '../components/TaskActions';
/** TODO: document */
export { QuickAddDialog } from '../components/QuickAddDialog';
/** TODO: document */
export { FilterDrawer } from '../components/FilterDrawer';
/** TODO: document */
export { TaskHeaderBand, TaskStepperBand, StatusBadge } from '../components/TaskDetail';
/** TODO: document */
export {
  CompletedHero,
  WorkflowCompletionTimeline,
  CompletedActionBar,
  CompletedSidebar,
  SummaryStats,
  CompletedTaskPageContent,
} from '../components/completed';

export { default as TaskForm } from '../components/TaskForm/TaskForm';
export { default as TaskFormWizard } from '../components/TaskForm/TaskFormWizard';
export { useTaskForm } from '../components/TaskForm/useTaskForm';
export { useTaskFormSteps } from '../components/TaskForm/TaskFormSteps';
export { useTaskFormSubmission } from '../components/TaskForm/TaskFormSubmission';
export { TaskSummaryCard } from '../components/TaskForm/TaskSummaryCard';
export { TaskActionBar } from '../components/TaskForm/TaskActionBar';
export { VehicleStep } from '../components/TaskForm/steps/VehicleStep';
export { CustomerStep } from '../components/TaskForm/steps/CustomerStep';
export { PPFStep } from '../components/TaskForm/steps/PPFStep';
export { ScheduleStep } from '../components/TaskForm/steps/ScheduleStep';
export type { FormStep, TaskFormData, TaskFormProps, FormStepProps, PPFZone } from '../components/TaskForm/types';
export { ENHANCED_STEPS, DEFAULT_FORM_DATA, ENHANCED_VALIDATION_RULES, PPF_ZONES, VEHICLE_MAKES, TIME_SLOTS } from '../components/TaskForm/types';


/** TODO: document */
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
/** TODO: document */
export { useTaskSync } from '../hooks/useTaskSync';
/** TODO: document */
export { useTaskStatus } from '../hooks/useTaskStatus';
/** TODO: document */
export { useTaskState } from '../hooks/useTaskState';
/** TODO: document */
export { useTaskFilters } from '../hooks/useTaskFilters';
/** TODO: document */
export { useTaskFiltering } from '../hooks/useTaskFiltering';
/** TODO: document */
export { useDashboardTaskFiltering } from '../hooks/useDashboardTaskFiltering';
/** TODO: document */
export { useWorkflowStepAutoSave } from '../hooks/useWorkflowStepAutoSave';
/** TODO: document */
export { useCompletedTaskPage } from '../hooks/useCompletedTaskPage';
/** TODO: document */
export { useTaskDetailPage } from '../hooks/useTaskDetailPage';
/** TODO: document */
export { useEditTaskPage } from '../hooks/useEditTaskPage';
/** TODO: document */
export { useNewTaskPage } from '../hooks/useNewTaskPage';
/** TODO: document */
export { taskGateway } from './taskGateway';
/** TODO: document */
export { getTaskDisplayTitle, getTaskDisplayStatus } from '../utils/display';
/** TODO: document */
export {
  getStatusBadgeClass,
  getStatusVariant,
  formatTaskDateTime,
  formatDateShort,
  mapTaskErrorToUserMessage,
} from '../utils/task-presentation';
/** TODO: document */
export { downloadTasksCsv, importTasksFromCsv } from '../services/task-csv.service';
/** TODO: document */
export type { ExportCsvOptions } from '../services/task-csv.service';

/** TODO: document */
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
/** TODO: document */
export type { UpdateTaskData, TaskPhotoQueryParams } from '../server';

/** TODO: document */
export {
  TaskWorkflowSyncService,
  taskWorkflowSyncService,
} from '../services';
