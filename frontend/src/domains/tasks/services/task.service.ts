import type { UpdateTaskRequest, TaskQuery, CreateTaskRequest, PaginationInfo, JsonValue } from '@/lib/backend';
import type { TaskWithDetails } from '@/types/task.types';
import type { ServiceResponse } from '@/types/unified.types';
import { ipcClient } from '@/lib/ipc';
import { taskIpc } from '../ipc/task.ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskQuerySchema,
  validateAndSanitizeInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskQueryInput,
} from '@/lib/validation/api-schemas';
import {
  generateUniqueTaskNumber,
  isValidTaskNumberFormat,
} from '../utils/number-generator';

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

  private normalizeStepData(data: unknown): Record<string, unknown> {
    return typeof data === 'object' && data !== null ? { ...(data as Record<string, unknown>) } : {};
  }

  private toJsonValue(value: unknown): JsonValue {
    return value as JsonValue;
  }

  private async getSessionToken(): Promise<string> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new Error('Authentication required');
    }
    return session.token;
  }

  private buildUpdateRequest(partial: Partial<UpdateTaskRequest>): UpdateTaskRequest {
    return {
      id: null,
      title: null,
      description: null,
      priority: null,
      status: null,
      vehicle_plate: null,
      vehicle_model: null,
      vehicle_year: null,
      vehicle_make: null,
      vin: null,
      ppf_zones: null,
      custom_ppf_zones: null,
      client_id: null,
      customer_name: null,
      customer_email: null,
      customer_phone: null,
      customer_address: null,
      external_id: null,
      lot_film: null,
      checklist_completed: null,
      scheduled_date: null,
      start_time: null,
      end_time: null,
      date_rdv: null,
      heure_rdv: null,
      template_id: null,
      workflow_id: null,
      estimated_duration: null,
      notes: null,
      tags: null,
      technician_id: null,
      ...partial,
    };
  }



  /**
   * Sets the user context for the service
   * @param userId - The user ID
   * @param user - Optional user data
   */
  setUserContext(_userId: string, _user?: Record<string, unknown>): void {
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
  async getTasks(query?: Partial<TaskQuery>): Promise<ServiceResponse<{ data: TaskWithDetails[], pagination: PaginationInfo }>> {
    try {
      const sessionToken = await this.getSessionToken();
      const result = await taskIpc.list(query || {}, sessionToken);
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
      const sessionToken = await this.getSessionToken();
      const result = await taskIpc.create(data, sessionToken);
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
  setUser(_userId: string): void {
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
      const sessionToken = await this.getSessionToken();
      await taskIpc.update(id, data, sessionToken);
      return { success: true, data: { id }, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Assigns a task to a technician via API route (web backend flow)
   *
   * @param taskId - Task ID to assign
   * @param technicianId - Technician user ID to assign
   * @returns Promise resolving to service response with updated task
   */
  async assignTask(taskId: string, technicianId: string): Promise<ServiceResponse<TaskWithDetails>> {
    try {
      const sessionToken = await this.getSessionToken();
      const updateData = this.buildUpdateRequest({ technician_id: technicianId });
      const result = await taskIpc.update(taskId, updateData, sessionToken);
      return { success: true, data: result as TaskWithDetails, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Marks a task as invalid via API route (web backend flow)
   *
   * @param taskId - Task ID to mark as invalid
   * @param reason - Optional reason
   * @returns Promise resolving to service response
   */
  async markTaskInvalid(taskId: string, reason?: string): Promise<ServiceResponse<unknown>> {
    try {
      const sessionToken = await this.getSessionToken();
      const task = await taskIpc.get(taskId, sessionToken);
      if (!task) {
        return { success: false, error: 'Task not found', status: 404 };
      }

      const existingNotes = task.notes ? String(task.notes) : '';
      const appendedNotes = reason
        ? `${existingNotes}${existingNotes ? '\n' : ''}Invalid: ${reason}`
        : existingNotes || null;

      const updateData = this.buildUpdateRequest({
        status: 'invalid',
        notes: appendedNotes,
      });

      await taskIpc.update(taskId, updateData, sessionToken);
      return { success: true, data: { id: taskId }, status: 200 };
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
    const sessionToken = await this.getSessionToken();
    await taskIpc.delete(id, sessionToken);
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
  async updateTaskStepData(taskId: string, stepId: string, data: unknown, _userId?: string, _updatedAt?: string): Promise<ServiceResponse<unknown>> {
    try {
      const sessionToken = await this.getSessionToken();

      // First, get the active intervention for this task
      const interventionResponse = await ipcClient.interventions.getActiveByTask(taskId, sessionToken);
      let interventionId: string | null = null;

      if (interventionResponse && typeof interventionResponse === 'object') {
        if ('intervention' in interventionResponse) {
          const intervention = (interventionResponse as { intervention?: { id?: string } }).intervention;
          interventionId = intervention?.id ?? null;
        } else if ('interventions' in interventionResponse && Array.isArray((interventionResponse as { interventions?: unknown }).interventions)) {
          const interventions = (interventionResponse as { interventions: Array<{ id?: string }> }).interventions;
          interventionId = interventions[0]?.id ?? null;
        } else if ('type' in interventionResponse) {
          const typedResponse = interventionResponse as { type?: string; intervention?: { id?: string }; interventions?: Array<{ id?: string }> };
          if (typedResponse.type === 'ActiveRetrieved' && typedResponse.intervention?.id) {
            interventionId = typedResponse.intervention.id;
          } else if (typedResponse.type === 'ActiveByTask' && typedResponse.interventions?.length) {
            interventionId = typedResponse.interventions[0]?.id ?? null;
          }
        }
      }

      if (!interventionId) {
        return {
          success: false,
          error: `No active intervention found for task ${taskId}. Please start the intervention first.`,
          status: 404
        };
      }

      const normalizedData = this.normalizeStepData(data);

      // Prepare step progress data
      const stepProgressData: Record<string, unknown> = {
        intervention_id: interventionId,
        step_id: stepId,
        progress_data: normalizedData,
        notes: typeof normalizedData.notes === 'string' ? normalizedData.notes : '',
        quality_score: normalizedData.quality_score ?? null,
        completion_percentage: typeof normalizedData.completion_percentage === 'number' ? normalizedData.completion_percentage : 0,
        estimated_time_remaining: normalizedData.estimated_time_remaining ?? null,
        issues_encountered: Array.isArray(normalizedData.issues_encountered) ? normalizedData.issues_encountered : [],
        materials_used: Array.isArray(normalizedData.materials_used) ? normalizedData.materials_used : [],
        photos_taken: Array.isArray(normalizedData.photos_taken) ? normalizedData.photos_taken : [],
        location_data: normalizedData.location_data ?? null,
        weather_conditions: normalizedData.weather_conditions ?? null,
        equipment_used: Array.isArray(normalizedData.equipment_used) ? normalizedData.equipment_used : [],
        safety_checks_completed: Array.isArray(normalizedData.safety_checks_completed) ? normalizedData.safety_checks_completed : [],
        customer_feedback: normalizedData.customer_feedback ?? null,
      };

      // Save step progress using intervention service
      const savedStep = await ipcClient.interventions.saveStepProgress({
        step_id: stepId,
        collected_data: this.toJsonValue(stepProgressData),
        notes: typeof stepProgressData.notes === 'string' ? stepProgressData.notes : null,
        photos: null,
      }, sessionToken);

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
  async getTaskStepData(
    taskId: string,
    stepId: string,
    _userId?: string
  ): Promise<ServiceResponse<{ stepData: unknown; lastUpdated: string | null; taskStatus: string | null }>> {
    try {
      const sessionToken = await this.getSessionToken();

      // Get step data directly using intervention service
      const stepData = await ipcClient.interventions.getStep(stepId, sessionToken);

      // Step exists, return success
      return {
        success: true,
        data: {
          stepData: stepData.collected_data || stepData.step_data || {},
          lastUpdated: stepData.updated_at ? String(stepData.updated_at) : null,
          taskStatus: stepData.step_status ?? null,
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
      const sessionToken = await this.getSessionToken();
      const result = await taskIpc.get(id, sessionToken);

      if (result === null) {
        return { success: false, error: 'Task not found', status: 404 };
      }

      return { success: true, data: result as TaskWithDetails, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Generates a unique task number using API route (web backend flow)
   */
  async generateTaskNumber(): Promise<ServiceResponse<{ task_number: string }>> {
    try {
      const result = generateUniqueTaskNumber({ maxRetries: 1 }, null);
      if (!result.success || !result.taskNumber) {
        return { success: false, error: result.error || 'Failed to generate task number', status: 500 };
      }
      return { success: true, data: { task_number: result.taskNumber }, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Validates a task number format using API route (web backend flow)
   */
  async validateTaskNumber(taskNumber: string): Promise<ServiceResponse<{ task_number: string; is_valid: boolean }>> {
    try {
      const isValid = isValidTaskNumberFormat(taskNumber);
      return { success: true, data: { task_number: taskNumber, is_valid: isValid }, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Retrieves tasks from validated API route (web backend flow)
   */
  async getValidatedTasks(query: Partial<TaskQueryInput> = {}): Promise<ServiceResponse<unknown>> {
    try {
      const sessionToken = await this.getSessionToken();
      const validated = validateAndSanitizeInput(TaskQuerySchema, query);
      const limit = validated.limit ?? 20;
      const offset = validated.offset ?? 0;
      const page = Math.floor(offset / limit) + 1;
      const result = await taskIpc.list({
        page,
        limit,
        status: validated.status ?? null,
        priority: validated.priority ?? null,
        technician_id: validated.technician_id ?? null,
        client_id: validated.client_id ?? null,
        search: validated.search ?? null,
      }, sessionToken);

      return { success: true, data: result, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Creates a task through validated API route (web backend flow)
   */
  async createValidatedTask(data: CreateTaskInput): Promise<ServiceResponse<unknown>> {
    try {
      const sessionToken = await this.getSessionToken();
      const validated = validateAndSanitizeInput(CreateTaskSchema, data);
      const result = await taskIpc.create(validated as CreateTaskRequest, sessionToken);
      return { success: true, data: result, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Updates a task through validated API route (web backend flow)
   */
  async updateValidatedTask(taskId: string, data: UpdateTaskInput): Promise<ServiceResponse<unknown>> {
    try {
      const sessionToken = await this.getSessionToken();
      const validated = validateAndSanitizeInput(UpdateTaskSchema, data);
      const updateData = this.buildUpdateRequest({
        title: validated.title ?? null,
        description: validated.description ?? null,
        status: validated.status ?? null,
        priority: validated.priority ?? null,
        technician_id: validated.assigned_to ?? null,
      });
      const result = await taskIpc.update(taskId, updateData, sessionToken);
      return { success: true, data: result, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Syncs a task with workflow via API route (web backend flow)
   */
  async syncTaskWorkflow(taskId: string): Promise<ServiceResponse<unknown>> {
    try {
      const { TaskWorkflowSyncService } = await import('./task-workflow-sync.service');
      const result = await TaskWorkflowSyncService.syncTaskWithWorkflow(taskId);
      return { success: true, data: result, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Retrieves task with workflow progress via API route (web backend flow)
   */
  async getTaskWorkflowProgress(taskId: string): Promise<ServiceResponse<unknown>> {
    try {
      const { TaskWorkflowSyncService } = await import('./task-workflow-sync.service');
      const result = await TaskWorkflowSyncService.getTaskWithWorkflowProgress(taskId);
      return { success: true, data: result, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Syncs all tasks with workflows via API route (web backend flow)
   */
  async syncAllTaskWorkflows(): Promise<ServiceResponse<unknown>> {
    try {
      const { TaskWorkflowSyncService } = await import('./task-workflow-sync.service');
      const result = await TaskWorkflowSyncService.syncAllTasksWithWorkflows();
      return { success: true, data: result, status: 200 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }
}

export const taskService = TaskService.getInstance();

// Re-export types for convenience
export type { TaskWithDetails };

