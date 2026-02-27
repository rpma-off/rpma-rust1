import { DashboardFilters, DashboardData, TechnicianSummary } from '../server';
import { TaskWithDetails } from '@/types/task.types';
import { DashboardTask, transformTask, RawTaskData } from '@/domains/analytics/components/dashboard/types';
import { FetchError } from '@/lib/utils/fetch-error-handler';
import { normalizeError } from '@/types/utility.types';

export interface DashboardState {
  tasks: DashboardTask[];
  stats: DashboardData['stats'] | null;
  technicians: TechnicianSummary[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingTechnicians: boolean;
  error: FetchError | null;
  connectionStatus: 'online' | 'offline' | 'checking';
  lastUpdated: Date | null;
  cacheStats: {
    hits: number;
    misses: number;
    size: number;
  } | null;
}

export function createInitialDashboardState(): DashboardState {
  return {
    tasks: [],
    stats: null,
    technicians: [],
    isLoading: true,
    isRefreshing: false,
    isLoadingTechnicians: false,
    error: null,
    connectionStatus: 'online',
    lastUpdated: null,
    cacheStats: null
  };
}

export function buildDashboardFilters(
  userId: string,
  isAdmin: boolean,
  options: {
    selectedTechnicianId?: string;
    statusFilter?: string;
    searchQuery?: string;
  }
): DashboardFilters {
  return {
    isAdmin,
    userId,
    selectedTechnicianId: options.selectedTechnicianId,
    status: options.statusFilter,
    search: options.searchQuery
  };
}

export function transformDashboardTasks(
  tasks: TaskWithDetails[],
  technicians: TechnicianSummary[],
  onTransformError: (message: string, error: unknown, context: { taskId: string }) => void
): DashboardTask[] {
  return tasks
    .map((task: TaskWithDetails) => {
      try {
        const technician = technicians.find(t => t.id === task.technician_id) || null;
        const rawTask: RawTaskData = {
          id: task.id,
          title: task.title,
          vehicle_plate: task.vehicle_plate,
          vehicle_model: task.vehicle_model,
          vehicle_year: task.vehicle_year,
          ppf_zones: task.ppf_zones,
          technician: technician
            ? {
                id: technician.id,
                name: technician.name,
                email: technician.email,
                initials: technician.name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              }
            : null,
          status: task.status,
          start_time: task.start_time,
          end_time: task.end_time,
          scheduled_date: task.scheduled_date,
          checklist_completed: task.checklist_completed || false,
          photos_before: task.photos_before || [],
          photos_after: task.photos_after || [],
          checklist_items: task.checklist_items || [],
          created_at: task.created_at as unknown as string,
          updated_at: task.updated_at as unknown as string,
          customer_name: task.customer_name
        };
        return transformTask(rawTask);
      } catch (error: unknown) {
        onTransformError('Failed to transform task', normalizeError(error), { taskId: task.id });
        return null;
      }
    })
    .filter((task): task is DashboardTask => task !== null);
}
