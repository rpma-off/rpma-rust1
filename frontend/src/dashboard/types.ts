import { ReactNode } from 'react';
import { TaskStatus, TaskPriority } from '@/lib/backend';

// ==================== BASE TYPES ====================

/**
 * Task status types
 */
export type { TaskStatus };

/**
 * Priority levels for tasks
 */
export type Priority = TaskPriority;

/**
 * Filter option for dropdowns
 */
export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// View Modes
export type ViewMode = 'overview' | 'analytics' | 'tasks' | 'management' | 'workflows' | 'quality' | 'photos';

// Dashboard Task Interface
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
  photos: {
    before: Array<{ id: string; url: string }>;
    after: Array<{ id: string; url: string }>;
  };
  checklistItems: Array<{
    id: string;
    description: string | null;
    completed: boolean;
  }>;
  createdAt: string | null;
  updatedAt: string | null;
  customer_name?: string | null;
}

// Dashboard Statistics
export interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  averageCompletionTime: number;
  efficiencyRate: number;
  productivityTrend: number;
  topTechnician: string;
  completionRate: number;
  avgTasksPerTechnician: number;
  mostActiveZone: string;
  byTechnician: Array<{
    technician: string;
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    efficiency: number;
  }>;
  byDate: Array<{
    date: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  byPPFZone: Array<{
    zone: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  byVehicleModel: Array<{
    model: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  trendData: Array<{
    date: string;
    tasks: number;
    completionRate: number;
    avgTime: number;
  }>;
}

// Technician Interface
export interface Technician {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  initials: string;
}

// Quick Actions Props
export interface QuickActionsProps {
  className?: string;
}

// Type for the raw task data from database queries
export interface RawTaskData {
  id: string;
  title?: string | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  ppf_zones?: string[] | null;
  technician?: {
    id?: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    initials?: string;
  } | null;
  status?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  scheduled_date?: string | null;
  checklist_completed?: boolean | null;
  photos_before?: unknown[] | null;
  photos_after?: unknown[] | null;
  checklist_items?: unknown[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  customer_name?: string | null;
}

// Utility function to transform TaskWithDetails to DashboardTask
export function transformTask(task: RawTaskData): DashboardTask {
  return {
    id: task.id,
    title: task.title || 'Tâche sans titre',
    vehicle: task.vehicle_plate || 'Inconnu',
    vehicle_model: task.vehicle_model || undefined,
    vehicle_year: task.vehicle_year || undefined,
    zones: task.ppf_zones || [],
    technician: task.technician ? {
      id: task.technician.id || '',
      first_name: task.technician.first_name || null,
      last_name: task.technician.last_name || null,
      name: task.technician.name || task.technician.first_name || task.technician.last_name || 'Sans technicien',
      email: task.technician.email || null,
      initials: (task.technician.name || task.technician.first_name || task.technician.last_name || '').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'NA'
    } : null,
    status: (task.status === 'pending' ? 'pending' :
            task.status === 'in_progress' ? 'in_progress' :
            task.status === 'completed' ? 'completed' : 'pending') as TaskStatus,
    priority: 'medium' as TaskPriority,
    startTime: task.start_time || null,
    endTime: task.end_time || null,
    scheduledDate: task.scheduled_date || null,
    duration: null,
    progress: 0,
    checklistCompleted: task.checklist_completed || false,
    photos: {
      before: Array.isArray(task.photos_before)
        ? task.photos_before.filter((p): p is { id: string; url: string } =>
            typeof p === 'object' && p !== null && 'id' in p && 'url' in p
          ).map((p) => ({ id: p.id, url: p.url }))
        : [],
      after: Array.isArray(task.photos_after)
        ? task.photos_after.filter((p): p is { id: string; url: string } =>
            typeof p === 'object' && p !== null && 'id' in p && 'url' in p
          ).map((p) => ({ id: p.id, url: p.url }))
        : []
    },
    checklistItems: Array.isArray(task.checklist_items)
      ? task.checklist_items.filter((item): item is { id: string; description: string | null; is_completed?: boolean; completed?: boolean } =>
          typeof item === 'object' && item !== null && 'id' in item
        ).map((item) => ({
          id: item.id,
          description: item.description,
          completed: item.is_completed || item.completed || false
        }))
      : [],
    createdAt: task.created_at || null,
    updatedAt: task.updated_at || null,
    customer_name: task.customer_name || null
  };
}

// Map API status to dashboard status
export const mapStatus = (status: string | null): TaskStatus => {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'en_attente':
      return 'pending';
    case 'en_cours':
      return 'in_progress';
    case 'termine':
      return 'completed';
    default:
      return 'pending';
  }
};

// Main Dashboard Props
export interface DashboardProps {
  // Core data
  tasks: DashboardTask[];
  technicians: Technician[];
  
  // Configuration
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showSidebar?: boolean;
  showAnalytics?: boolean;
  showPerformanceMetrics?: boolean;
  showQuickActions?: boolean;
  showRecentTasks?: boolean;
  
  // Task management
  showCreateButton?: boolean;
  createButtonText?: string;
  createButtonHref?: string;
  enableSearch?: boolean;
  enableStatusFilter?: boolean;
  enablePriorityFilter?: boolean;
  enableTechnicianFilter?: boolean;
  showTaskCount?: boolean;
  
  // Filtering and sorting
  initialStatus?: TaskStatus | 'all';
  initialPriority?: Priority | 'all';
  initialSearchQuery?: string;
  initialTechnician?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // Custom content
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  emptyState?: ReactNode;
  statusFilterOptions?: FilterOption[];
  priorityFilterOptions?: FilterOption[];
  
  // Callbacks
  onTaskSelect?: (taskId: string) => void;
  onTaskUpdate?: (task: DashboardTask) => void;
  onTaskDelete?: (taskId: string) => void;
  onSearch?: (term: string) => void;
  onStatusFilterChange?: (status: TaskStatus | 'all') => void;
  onPriorityFilterChange?: (priority: Priority | 'all') => void;
  onTechnicianSelect?: (technicianId: string) => void;
  onFiltersChange?: (filters: {
    status: TaskStatus | 'all';
    priority: Priority | 'all';
    search: string;
    technician: string;
  }) => void;
  onRefresh?: () => void;
  onNewTask?: () => void;
  
  // State
  isLoading?: boolean;
  error?: string | null;
  selectedTaskId?: string | null;
  
  // Styling
  className?: string;
  theme?: 'default' | 'dark' | 'light';
}

// Dashboard Header Props
export interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onSearch?: (term: string) => void;
  searchQuery?: string;
  className?: string;
}

// Dashboard Section Props
export interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// Dashboard Widget Props
export interface DashboardWidgetProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: ReactNode;
  className?: string;
  onClick?: () => void;
  loading?: boolean;
}

// Task List Props
export interface TaskListProps {
  tasks: DashboardTask[];
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string) => void;
  onTaskUpdate?: (task: DashboardTask) => void;
  onTaskDelete?: (taskId: string) => void;
  showTaskCount?: boolean;
  emptyState?: ReactNode;
  className?: string;
}

// Task Filters Props
export interface TaskFiltersProps {
  searchQuery: string;
  onSearch: (term: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  priorityFilter: Priority | 'all';
  onPriorityFilterChange: (priority: Priority | 'all') => void;
  technicianFilter: string;
  onTechnicianFilterChange: (technicianId: string) => void;
  technicians: Technician[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string) => void;
  onResetFilters: () => void;
  enableSearch?: boolean;
  enableStatusFilter?: boolean;
  enablePriorityFilter?: boolean;
  enableTechnicianFilter?: boolean;
  statusFilterOptions?: FilterOption[];
  priorityFilterOptions?: FilterOption[];
  className?: string;
}

// Stats Grid Props
export interface StatsGridProps {
  stats: DashboardStats;
  className?: string;
}

// Performance Metrics Props
export interface PerformanceMetricsProps {
  metrics: DashboardStats;
  className?: string;
}

// Quick Actions Props
export interface QuickActionsProps {
  onNewTask?: () => void;
  className?: string;
}

// Recent Tasks Preview Props
export interface RecentTasksPreviewProps {
  tasks: DashboardTask[];
  onTaskClick?: (taskId: string) => void;
  className?: string;
}

// Chart Data Interface
export interface ChartData {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  averageCompletionTime: number;
  efficiencyRate: number;
  productivityTrend: number;
  topTechnician: string;
  completionRate: number;
  avgTasksPerTechnician: number;
  mostActiveZone: string;
  byTechnician: Array<{
    technician: string;
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    efficiency: number;
  }>;
  byDate: unknown[];
  byPPFZone: unknown[];
  byVehicleModel: unknown[];
  trendData: unknown[];
}

// Export all types for backward compatibility
export type {
  DashboardTask as Task,
  DashboardStats as Stats,
  Technician as User,
  FilterOption as Option
};
