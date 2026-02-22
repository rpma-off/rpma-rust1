/**
 * Tauri IPC Service Layer
 *
 * Wrapper functions for Tauri commands with error handling
 */

import { ipcClient } from '@/lib/ipc';
import { logger, LogContext } from './logger';
import type {
  LoginCredentials,
  SignupCredentials,
  UserSession,
  AuthResponse,
  ApiResponse,
  Task,
  TaskWithDetails,
  TaskFilters,
  TaskListResponse,
  TaskStatistics
} from '@/types';
import type { CreateTaskRequest, UpdateTaskRequest, UserAccount } from '@/lib/backend';
import { windowManager, desktopNavigation, shellOps } from './utils/desktop';
import { gps } from './utils/gps';
import type { Coordinates } from './utils/gps';

/**
 * Utility function to convert Unix timestamp (seconds) to ISO string, or return ISO string as-is
 */
function unixToIso(unix: number | string | null | undefined): string | undefined {
  if (!unix) return undefined;
  if (typeof unix === 'string') return unix; // Already ISO string
  return new Date(unix * 1000).toISOString();
}

interface InterventionWithCompletion {
  completion_percentage?: number;
}

const TASK_STATUS_VALUES: ReadonlyArray<Task['status']> = [
  'draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold',
  'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused'
];

const TASK_PRIORITY_VALUES: ReadonlyArray<Task['priority']> = ['low', 'medium', 'high', 'urgent'];

function toTaskStatus(value?: string): Task['status'] | null {
  if (!value || value === 'all') return null;
  return TASK_STATUS_VALUES.includes(value as Task['status']) ? (value as Task['status']) : null;
}

function toTaskPriority(value?: string): Task['priority'] | null {
  if (!value || value === 'all') return null;
  return TASK_PRIORITY_VALUES.includes(value as Task['priority']) ? (value as Task['priority']) : null;
}

/**
 * Test service for debugging
 */
export class TestService {
  static async healthCheck(): Promise<string> {
    try {
      logger.debug(LogContext.SYSTEM, 'Calling health_check command');
      const result = await ipcClient.admin.healthCheck() as string;
      logger.info(LogContext.SYSTEM, 'Health check result', { result });
      return result;
    } catch (error) {
      logger.error(LogContext.SYSTEM, 'Health check error', { error });
      return 'ERROR';
    }
  }
}

/**
 * Authentication service
 */
export class AuthService {
  /**
   * Login user
   */
       static async login(credentials: LoginCredentials): Promise<AuthResponse<UserSession>> {
         try {
       logger.info(LogContext.AUTH, 'AuthService.login called', { email: credentials.email, passwordLength: credentials.password.length });
       logger.debug(LogContext.AUTH, 'Calling ipcClient for auth_login');
         const userSession = await ipcClient.auth.login(credentials.email, credentials.password);
       logger.info(LogContext.AUTH, 'AuthService.login response', {
         success: true
       });
           return { success: true, data: userSession };
         } catch (error) {
           logger.error(LogContext.AUTH, 'AuthService.login error', {
            error: error instanceof Error ? error.message : String(error)
          });
           return {
             success: false,
             error: error instanceof Error ? error.message : 'Login failed'
           };
         }
       }

  /**
   * Create new account
   */
    static async signup(credentials: SignupCredentials): Promise<AuthResponse<UserSession>> {
      try {
         const requestData = {
           email: credentials.email,
           first_name: credentials.first_name,
           last_name: credentials.last_name,
           password: credentials.password,
           role: credentials.role as 'admin' | 'technician' | 'supervisor' | 'viewer' | undefined
         };
         const userSession = await ipcClient.auth.createAccount(requestData);
        return { success: true, data: userSession };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Account creation failed'
        };
      }
   }

  /**
   * Logout user
   */
  static async logout(token: string): Promise<AuthResponse<void>> {
    try {
      await ipcClient.auth.logout(token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      };
    }
  }

  /**
   * Validate session
   */
   static async validateSession(token: string): Promise<AuthResponse<UserSession>> {
     try {
       const userSession = await ipcClient.auth.validateSession(token);
       return { success: true, data: userSession };
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Session validation failed'
       };
     }
   }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResponse<UserSession>> {
    try {
      const userSession = await ipcClient.auth.refreshToken(refreshToken);
      return { success: true, data: userSession };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string, token: string): Promise<{ type: string; data?: UserAccount }> {
    try {
      const result = await ipcClient.users.get(userId, token);
      if (result === null || (typeof result === 'object' && Object.keys(result).length === 0)) {
        return { type: 'NotFound' };
      }
      return { type: 'Found', data: result as UserAccount };
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Task service
 */
export class TaskService {
  /**
    * Get tasks with filters and pagination
    */
    static async getTasks(filters: TaskFilters = {}, token: string): Promise<ApiResponse<TaskListResponse>> {
      try {
         console.log('TaskService.getTasks called with filters:', filters);
         console.log('Token length:', token.length);

         // Convert TaskFilters to TaskQuery
           const taskQuery = {
             page: filters.page || 1,
             limit: filters.pageSize || 20,
            status: toTaskStatus(filters.status),
            technician_id: filters.assignedTo || null,
            client_id: null, // Not in TaskFilters
            priority: toTaskPriority(filters.priority),
            search: filters.search || null,
           from_date: filters.startDate || null,
           to_date: filters.endDate || null,
           sort_by: 'created_at',
           sort_order: 'desc' as const
         };

          console.log('Converted TaskQuery:', taskQuery);
           const taskList = await ipcClient.tasks.list(taskQuery, token);

            // Convert the response to TaskListResponse format
            const convertedTasks = await Promise.all(taskList.data.map(async (task) => {
            // Calculate progress based on intervention completion
            let progress = 0;
            try {
              const interventionResponse = await ipcClient.interventions.getActiveByTask(task.id, token);

              // Check if we got a valid response
              if (interventionResponse && typeof interventionResponse === 'object' && 'type' in interventionResponse) {
                const typedResult = interventionResponse as { type: string; intervention?: InterventionWithCompletion };

                if (typedResult.type === 'ActiveRetrieved' && typedResult.intervention?.completion_percentage !== undefined) {
                  progress = typedResult.intervention.completion_percentage;
                }
              }
            } catch (error) {
              console.warn(`Failed to get progress for task ${task.id}:`, error);
              // Keep progress as 0 for failed requests
            }

            // Calculate overdue status
            const is_overdue = task.scheduled_date ?
              new Date(task.scheduled_date) < new Date() &&
              (task.status === 'scheduled' || task.status === 'pending' || task.status === 'assigned') :
              false;

            return {
            // Base Task fields with converted timestamps
            id: task.id,
            task_number: task.task_number,
            title: task.title,
            description: task.description ?? null,
            vehicle_plate: task.vehicle_plate ?? null,
            vehicle_model: task.vehicle_model ?? null,
            vehicle_year: task.vehicle_year ?? null,
            vehicle_make: task.vehicle_make ?? null,
            vin: task.vin ?? null,
            ppf_zones: task.ppf_zones ?? null,
            custom_ppf_zones: task.custom_ppf_zones ?? null,
            status: task.status,
            priority: task.priority,
            technician_id: task.technician_id ?? null,
            assigned_at: unixToIso(task.assigned_at as unknown as number) || null,
            assigned_by: task.assigned_by ?? null,
            scheduled_date: task.scheduled_date ?? null,
            start_time: task.start_time ?? null,
            end_time: task.end_time ?? null,
            date_rdv: task.date_rdv ?? null,
            heure_rdv: task.heure_rdv ?? null,
            template_id: task.template_id ?? null,
            workflow_id: task.workflow_id ?? null,
            workflow_status: task.workflow_status ?? null,
            current_workflow_step_id: task.current_workflow_step_id ?? null,
            started_at: unixToIso(task.started_at as unknown as number) || null,
            completed_at: unixToIso(task.completed_at as unknown as number) || null,
            completed_steps: task.completed_steps ?? null,
            client_id: task.client_id ?? null,
            customer_name: task.customer_name ?? null,
            customer_email: task.customer_email ?? null,
            customer_phone: task.customer_phone ?? null,
            customer_address: task.customer_address ?? null,
            external_id: task.external_id ?? null,
            lot_film: task.lot_film ?? null,
            checklist_completed: task.checklist_completed,
            notes: task.notes ?? null,
            tags: task.tags ?? null,
            estimated_duration: task.estimated_duration ?? null,
            actual_duration: task.actual_duration ?? null,
            created_at: unixToIso(task.created_at as unknown as number) as string,
            updated_at: unixToIso(task.updated_at as unknown as number) as string,
            creator_id: task.creator_id ?? null,
            created_by: task.created_by ?? null,
            updated_by: task.updated_by ?? null,
            deleted_at: unixToIso(task.deleted_at as unknown as number) || null,
            deleted_by: task.deleted_by ?? null,
            synced: task.synced,
            last_synced_at: unixToIso(task.last_synced_at as unknown as number) || null,
            // Add computed fields
            progress,
            is_overdue,
          };
          }));

         const taskListResponse: TaskListResponse = {
           data: convertedTasks,
           pagination: {
             page: taskQuery.page,
             limit: taskQuery.limit,
             total: convertedTasks.length, // This should come from the backend
             total_pages: Math.ceil(convertedTasks.length / taskQuery.limit)
           },
           statistics: undefined // Not provided by ipcClient.tasks.list
         };

         console.log('Converted data length:', convertedTasks.length);
         return { success: true, data: taskListResponse };
     } catch (error) {
       console.error('Exception in TaskService.getTasks:', error);
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Failed to fetch tasks'
       };
     }
   }

  /**
    * Get single task by ID
    */
     static async getTask(id: string, token: string): Promise<ApiResponse<TaskWithDetails>> {
        try {
            const task = await ipcClient.tasks.get(id, token);
            if (!task) {
                return { success: false, error: 'Task not found', data: undefined };
            }

          const convertedTask: TaskWithDetails = {
            // Base Task fields with converted timestamps
            id: task.id,
            task_number: task.task_number,
            title: task.title,
            description: task.description ?? null,
            vehicle_plate: task.vehicle_plate ?? null,
            vehicle_model: task.vehicle_model ?? null,
            vehicle_year: task.vehicle_year ?? null,
            vehicle_make: task.vehicle_make ?? null,
            vin: task.vin ?? null,
            ppf_zones: task.ppf_zones ?? null,
            custom_ppf_zones: task.custom_ppf_zones ?? null,
            status: task.status,
            priority: task.priority,
            technician_id: task.technician_id ?? null,
            assigned_at: unixToIso(task.assigned_at as unknown as number) || null,
            assigned_by: task.assigned_by ?? null,
            scheduled_date: task.scheduled_date ?? null,
            start_time: task.start_time ?? null,
            end_time: task.end_time ?? null,
            date_rdv: task.date_rdv ?? null,
            heure_rdv: task.heure_rdv ?? null,
            template_id: task.template_id ?? null,
            workflow_id: task.workflow_id ?? null,
            workflow_status: task.workflow_status ?? null,
            current_workflow_step_id: task.current_workflow_step_id ?? null,
            started_at: unixToIso(task.started_at as unknown as number) || null,
            completed_at: unixToIso(task.completed_at as unknown as number) || null,
            completed_steps: task.completed_steps ?? null,
            client_id: task.client_id ?? null,
            customer_name: task.customer_name ?? null,
            customer_email: task.customer_email ?? null,
            customer_phone: task.customer_phone ?? null,
            customer_address: task.customer_address ?? null,
            external_id: task.external_id ?? null,
            lot_film: task.lot_film ?? null,
            checklist_completed: task.checklist_completed,
            notes: task.notes ?? null,
            tags: task.tags ?? null,
            estimated_duration: task.estimated_duration ?? null,
            actual_duration: task.actual_duration ?? null,
            created_at: unixToIso(task.created_at as unknown as number) as string,
            updated_at: unixToIso(task.updated_at as unknown as number) as string,
            creator_id: task.creator_id ?? null,
            created_by: task.created_by ?? null,
            updated_by: task.updated_by ?? null,
            deleted_at: unixToIso(task.deleted_at as unknown as number) || null,
            deleted_by: task.deleted_by ?? null,
            synced: task.synced,
            last_synced_at: unixToIso(task.last_synced_at as unknown as number) || null,
            // Add computed fields
            progress: 0, // TODO: calculate based on workflow steps
            is_overdue: false, // TODO: calculate based on scheduled_date
          };
           return { success: true, data: convertedTask };
      } catch (error) {
        if (error instanceof Error && (error.message || '').includes('not found')) {
          return { success: false, error: 'Task not found' };
        }
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Failed to fetch task'
       };
     }
   }

  /**
    * Create new task
    */
    static async createTask(taskData: CreateTaskRequest, token: string): Promise<ApiResponse<TaskWithDetails>> {
      try {
         const task = await ipcClient.tasks.create(taskData, token);

         const convertedTask: TaskWithDetails = {
           ...task,
           created_at: unixToIso(task.created_at as unknown as number) as string,
           updated_at: unixToIso(task.updated_at as unknown as number) as string,
           assigned_at: unixToIso(task.assigned_at as unknown as number) || null,
           started_at: unixToIso(task.started_at as unknown as number) || null,
           completed_at: unixToIso(task.completed_at as unknown as number) || null,
           last_synced_at: unixToIso(task.last_synced_at as unknown as number) || null,
           // Add computed fields
           progress: 0, // TODO: calculate based on workflow steps
           is_overdue: false, // TODO: calculate based on scheduled_date
         };
         return { success: true, data: convertedTask };
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Failed to create task'
       };
     }
   }

  /**
    * Update existing task
    */
    static async updateTask(id: string, updates: UpdateTaskRequest, token: string): Promise<ApiResponse<TaskWithDetails>> {
      try {
         const task = await ipcClient.tasks.update(id, updates, token);

         const convertedTask: TaskWithDetails = {
           ...task,
           created_at: unixToIso(task.created_at as unknown as number) as string,
           updated_at: unixToIso(task.updated_at as unknown as number) as string,
           assigned_at: unixToIso(task.assigned_at as unknown as number) || null,
           started_at: unixToIso(task.started_at as unknown as number) || null,
           completed_at: unixToIso(task.completed_at as unknown as number) || null,
           last_synced_at: unixToIso(task.last_synced_at as unknown as number) || null,
           // Add computed fields
           progress: 0, // TODO: calculate based on workflow steps
           is_overdue: false, // TODO: calculate based on scheduled_date
         };
         return { success: true, data: convertedTask };
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Failed to update task'
       };
     }
   }

  /**
   * Update task status
   */
   static async updateTaskStatus(id: string, status: Task['status'], token: string): Promise<ApiResponse<TaskWithDetails>> {
     return this.updateTask(id, { status } as UpdateTaskRequest, token);
   }

  /**
    * Delete task
    */
    static async deleteTask(id: string, token: string): Promise<ApiResponse<void>> {
      try {
         await ipcClient.tasks.delete(id, token);
         return { success: true };
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Failed to delete task'
       };
     }
   }

  /**
    * Get task statistics
    */
    static async getTaskStatistics(token: string): Promise<ApiResponse<TaskStatistics>> {
      try {
         const statistics = await ipcClient.tasks.statistics(token);
         return { success: true, data: statistics };
     } catch (error) {
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Failed to fetch task statistics'
       };
     }
   }
}

/**
 * UI service for window management and system integration
 */
export class UIService {
  /**
   * Minimize window
   */
  static async minimizeWindow(): Promise<void> {
    await windowManager.minimize();
  }

  /**
   * Maximize window
   */
  static async maximizeWindow(): Promise<void> {
    await windowManager.maximize();
  }

  /**
   * Close window
   */
  static async closeWindow(): Promise<void> {
    await windowManager.close();
  }

  /**
   * Get current GPS position
   */
  static async getCurrentPosition(): Promise<ApiResponse<{ lat: number; lon: number; accuracy: number }>> {
    try {
      const position: Coordinates = await gps.getCurrentPosition();
      return {
        success: true,
        data: {
          lat: position.latitude,
          lon: position.longitude,
          accuracy: position.accuracy || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get GPS position'
      };
    }
  }

  /**
   * Open URL in external browser
   */
  static async openUrl(url: string): Promise<void> {
    await shellOps.open(url);
  }
}

/**
 * Sync service for offline functionality
 */
export class SyncService {
  /**
   * Start synchronization
   */
  static async syncNow(): Promise<ApiResponse<void>> {
    try {
      await ipcClient.sync.syncNow();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  /**
   * Get sync status
   */
  static async getSyncStatus(): Promise<ApiResponse<{
    is_online: boolean;
    last_sync_at?: string;
    pending_operations: number;
    failed_operations: number;
    total_operations: number;
    is_syncing: boolean;
    error?: string;
  }>> {
    try {
      const status = await ipcClient.sync.getStatus();
      return { success: true, data: status as {
        is_online: boolean;
        last_sync_at?: string;
        pending_operations: number;
        failed_operations: number;
        total_operations: number;
        is_syncing: boolean;
        error?: string;
      } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status'
      };
    }
  }
}

/**
 * Navigation service
 */
export class NavigationService {
  /**
   * Update current navigation state
   */
  static async updateNavigation(path: string, title?: string): Promise<void> {
    await desktopNavigation.navigate(path, { title });
  }

  /**
   * Add to navigation history
   */
  static async addToHistory(path: string): Promise<void> {
    await desktopNavigation.addToHistory(path);
  }

  /**
   * Go back in navigation
   */
  static async goBack(): Promise<void> {
    await desktopNavigation.goBack();
  }

  /**
   * Go forward in navigation
   */
  static async goForward(): Promise<void> {
    await desktopNavigation.goForward();
  }

  /**
   * Get current navigation state
   */
  static async getCurrent(): Promise<ApiResponse<{ path: string; title?: string }>> {
    try {
      const current = await desktopNavigation.getCurrent() as { path: string; title?: string };
      return { success: true, data: current };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get navigation state'
      };
    }
  }
}
