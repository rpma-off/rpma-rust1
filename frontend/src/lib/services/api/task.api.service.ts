

interface GetTasksParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  technician_id?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: Error;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

import { TaskStatus, TaskPriority, TaskWithDetails, TaskListResponse, UpdateTaskRequest } from '@/lib/backend';
import { AuthSecureStorage } from '@/lib/secureStorage';
import { ipcClient } from '@/lib/ipc';

export class TaskApiService {
  private static instance: TaskApiService;

  static getInstance(): TaskApiService {
    if (!TaskApiService.instance) {
      TaskApiService.instance = new TaskApiService();
    }
    return TaskApiService.instance;
  }

  async getTasks(params: GetTasksParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { error: new Error('Authentication required') };
      }

      const filters = {
        page: params.page,
        limit: params.pageSize,
        sort_by: params.sortBy || 'created_at',
        sort_order: params.sortOrder || 'desc',
        technician_id: params.technician_id
      };

      const result = await ipcClient.tasks.list({
        page: filters.page,
        limit: filters.limit,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
        technician_id: filters.technician_id
      }, session.token);

      const response: PaginatedResponse<any> = {
        data: result.data || [],
        total: Number(result.pagination?.total) || 0,
        page: Number(result.pagination?.page) || params.page,
        pageSize: Number(result.pagination?.limit) || params.pageSize
      };
      return { data: response };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async updateTask(id: string, updates: Partial<TaskWithDetails>): Promise<ApiResponse<TaskWithDetails>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { error: new Error('Authentication required') };
      }

      // Convert updates to the format expected by IPC
      const updateData: UpdateTaskRequest = {
        id: null, // IPC handles id separately
        title: updates.title ?? null,
        description: updates.description ?? null,
        priority: updates.priority ?? null,
        status: updates.status ?? null,
        vehicle_plate: updates.vehicle_plate ?? null,
        vehicle_model: updates.vehicle_model ?? null,
        vehicle_year: updates.vehicle_year ?? null,
        vehicle_make: updates.vehicle_make ?? null,
        vin: updates.vin ?? null,
        ppf_zones: updates.ppf_zones ?? null,
        custom_ppf_zones: updates.custom_ppf_zones ?? null,
        client_id: updates.client_id ?? null,
        customer_name: updates.customer_name ?? null,
        customer_email: updates.customer_email ?? null,
        customer_phone: updates.customer_phone ?? null,
        customer_address: updates.customer_address ?? null,
        external_id: updates.external_id ?? null,
        lot_film: updates.lot_film ?? null,
        checklist_completed: updates.checklist_completed ?? null,
        scheduled_date: updates.scheduled_date ?? null,
        start_time: updates.start_time ?? null,
        end_time: updates.end_time ?? null,
        date_rdv: updates.date_rdv ?? null,
        heure_rdv: updates.heure_rdv ?? null,
        template_id: updates.template_id ?? null,
        workflow_id: updates.workflow_id ?? null,
        estimated_duration: updates.estimated_duration ?? null,
        notes: updates.notes ?? null,
        tags: updates.tags ?? null,
        technician_id: updates.technician_id ?? null,
      };

      const updatedTask = await ipcClient.tasks.update(id, updateData, session.token);
      return { data: updatedTask };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { error: new Error('Authentication required') };
      }

      await ipcClient.tasks.delete(id, session.token);
      return { data: undefined };
    } catch (error) {
      return { error: error as Error };
    }
  }
}

export const taskApiService = TaskApiService.getInstance();