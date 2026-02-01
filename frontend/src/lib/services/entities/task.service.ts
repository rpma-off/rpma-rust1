 import type { Task, UpdateTaskRequest, TaskQuery, CreateTaskRequest } from '@/lib/backend';
import type { TaskWithDetails } from '@/types/task.types';
import type { ServiceResponse } from '@/types/unified.types';
import { TaskStatus, TaskPriority } from '@/lib/backend';
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';

/**
 * Frontend Task Service - Client-side task management
 *
 * Provides a unified interface for task operations in the React frontend.
 * Handles authentication, IPC communication, and response formatting.
 * Uses singleton pattern to ensure consistent state across the application.
 *
 * @example
 * ```typescript
 * const taskService = TaskService.getInstance();
 * const tasks = await taskService.getTasks({ status: 'pending' });
 * ```
 */
export class TaskService {
  private static instance: TaskService;

  /**
   * Gets the singleton instance of TaskService
   * @returns The TaskService instance
   */
  static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }



  /**
   * Sets the user context for the service
   * @param userId - The user ID
   * @param user - Optional user data
   */
  setUserContext(userId: string, user?: Record<string, unknown>): void {
    // Implementation
  }

  /**
   * Clears the current user context
   */
  clearUserContext(): void {
    // Implementation
  }

  /**
   * Retrieves a list of tasks with optional filtering and pagination
   *
   * @param query - Optional query parameters for filtering tasks
   * @param query.status - Filter by task status (pending, in_progress, completed, etc.)
   * @param query.priority - Filter by task priority (low, medium, high, urgent)
   * @param query.search - Search term for task title/description
   * @param query.technician_id - Filter by assigned technician
   * @param query.from_date - Start date filter (ISO string)
   * @param query.to_date - End date filter (ISO string)
   * @param query.page - Page number for pagination (1-based)
   * @param query.limit - Number of tasks per page
   * @returns Promise resolving to service response with tasks array and pagination info
   *
   * @example
   * ```typescript
   * const result = await taskService.getTasks({
   *   status: 'in_progress',
   *   priority: 'high',
   *   page: 1,
   *   limit: 20
   * });
   * if (result.success) {
   *   console.log(result.data.data); // Array of tasks
   *   console.log(result.data.pagination); // Pagination info
   * }
   * ```
   */
  async getTasks(query?: Partial<TaskQuery>): Promise<ServiceResponse<{ data: TaskWithDetails[], pagination: any }>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await ipcClient.tasks.list(query || {}, session.token);
      return { success: true, data: { data: result.data as TaskWithDetails[], pagination: result.pagination }, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Creates a new task in the system
   *
   * @param data - The task creation data
   * @param data.vehicle_plate - Vehicle license plate (required)
   * @param data.vehicle_model - Vehicle model (required)
   * @param data.ppf_zones - Array of PPF zones to apply (required)
   * @param data.scheduled_date - Scheduled date for the task (required)
   * @param data.vehicle_make - Vehicle make (optional)
   * @param data.customer_name - Customer name (optional)
   * @param data.customer_email - Customer email (optional)
   * @param data.customer_phone - Customer phone (optional)
   * @param data.technician_id - Assigned technician ID (optional)
   * @param data.notes - Additional notes (optional)
   * @returns Promise resolving to service response with created task ID
   *
   * @example
   * ```typescript
   * const result = await taskService.createTask({
   *   vehicle_plate: 'ABC-123',
   *   vehicle_model: 'Toyota Camry',
   *   ppf_zones: ['hood', 'fenders'],
   *   scheduled_date: '2025-11-25',
   *   customer_name: 'John Doe'
   * });
   * ```
   */
  async createTask(data: CreateTaskRequest): Promise<ServiceResponse<{ id: string }>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await ipcClient.tasks.create(data, session.token);
      return { success: true, data: { id: result.id }, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Sets the current user for the service
   * @param userId - The user ID to set
   */
  setUser(userId: string): void {
    // Implementation
  }

  /**
   * Updates an existing task with new data
   *
   * @param id - The unique identifier of the task to update
   * @param data - The update data (partial task data)
   * @param data.status - Update task status
   * @param data.priority - Update task priority
   * @param data.technician_id - Reassign to different technician
   * @param data.notes - Update task notes
   * @param data.scheduled_date - Change scheduled date
   * @returns Promise resolving to service response with updated task ID
   *
   * @example
   * ```typescript
   * const result = await taskService.updateTask('task-123', {
   *   status: 'completed',
   *   notes: 'Task completed successfully'
   * });
   * ```
   */
  async updateTask(id: string, data: UpdateTaskRequest): Promise<ServiceResponse<{ id: string }>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      await ipcClient.tasks.update(id, data, session.token);
      return { success: true, data: { id }, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Permanently deletes a task by its ID
   *
   * @param id - The unique identifier of the task to delete
   * @throws Error if authentication fails or task doesn't exist
   *
   * @example
   * ```typescript
   * try {
   *   await taskService.deleteTask('task-123');
   *   console.log('Task deleted successfully');
   * } catch (error) {
   *   console.error('Failed to delete task:', error);
   * }
   * ```
   */
  async deleteTask(id: string): Promise<void> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new Error('Authentication required');
    }

    await ipcClient.tasks.delete(id, session.token);
  }

  /**
   * Updates step data for a task (delegates to intervention workflow service)
   * @param taskId - The task ID
   * @param stepId - The step ID
   * @param data - The step data to update
   * @param userId - Optional user ID
   * @param updatedAt - Optional update timestamp
   * @returns Promise resolving to service response
   */
  async updateTaskStepData(taskId: string, stepId: string, data: any, userId?: string, updatedAt?: string): Promise<ServiceResponse<any>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      // First, get the active intervention for this task
      const interventionResponse = await ipcClient.interventions.getActiveByTask(taskId, session.token) as { type: string; intervention: any };

      if (!interventionResponse || interventionResponse.type !== 'ActiveRetrieved' || !interventionResponse.intervention) {
        return {
          success: false,
          error: `No active intervention found for task ${taskId}. Please start the intervention first.`,
          status: 404
        };
      }

      // Extract intervention ID from the response
      const interventionId = interventionResponse.intervention.id;

      // Prepare step progress data
      const stepProgressData = {
        intervention_id: interventionId,
        step_id: stepId,
        progress_data: data,
        notes: data.notes || '',
        quality_score: data.quality_score || null,
        completion_percentage: data.completion_percentage || 0,
        estimated_time_remaining: data.estimated_time_remaining || null,
        issues_encountered: data.issues_encountered || [],
        materials_used: data.materials_used || [],
        photos_taken: data.photos_taken || [],
        location_data: data.location_data || null,
        weather_conditions: data.weather_conditions || null,
        equipment_used: data.equipment_used || [],
        safety_checks_completed: data.safety_checks_completed || [],
        customer_feedback: data.customer_feedback || null,
      };

      // Save step progress using intervention service
      const savedStep = await ipcClient.interventions.saveStepProgress({
        step_id: stepId,
        collected_data: stepProgressData,
        notes: stepProgressData.notes || null,
        photos: null,
      }, session.token);

      return {
        success: true,
        data: savedStep,
        status: 200
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Retrieves step data for a task (delegates to intervention workflow service)
   * @param taskId - The task ID
   * @param stepId - The step ID
   * @param userId - Optional user ID
   * @returns Promise resolving to service response
   */
  async getTaskStepData(taskId: string, stepId: string, userId?: string): Promise<ServiceResponse<any>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      // Get step data directly using intervention service
      const stepData = await ipcClient.interventions.getStep(stepId, session.token);

      // Step exists, return success
      return {
        success: true,
        data: {
          step_id: stepData.id,
          step_name: stepData.step_name || stepData.name,
          step_type: stepData.step_type || stepData.type,
          status: stepData.status,
          progress_data: stepData.progress_data || stepData.collected_data || {},
          started_at: stepData.started_at,
          completed_at: stepData.completed_at,
          actual_duration: stepData.actual_duration,
          quality_score: stepData.quality_score,
          notes: stepData.notes,
          intervention_id: stepData.intervention_id,
          task_id: taskId,
        },
        status: 200
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Retrieves a single task by its unique identifier
   *
   * @param id - The unique identifier of the task to retrieve
   * @returns Promise resolving to service response with complete task details
   *
   * @example
   * ```typescript
   * const result = await taskService.getTaskById('task-123');
   * if (result.success) {
   *   console.log('Task:', result.data);
   * } else {
   *   console.error('Task not found:', result.error);
   * }
   * ```
   */
  async getTaskById(id: string): Promise<ServiceResponse<TaskWithDetails>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await ipcClient.tasks.get(id, session.token);

      if (result === null) {
        return { success: false, error: 'Task not found', status: 404 };
      }

      return { success: true, data: result as TaskWithDetails, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }
}

export const taskService = TaskService.getInstance();

// Re-export types for convenience
export type { TaskWithDetails };