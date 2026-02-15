import { useCallback } from 'react';
import { TaskStatus, UpdateTaskRequest } from '@/lib/backend';
import { taskService } from '@/lib/services/entities/task.service';
import { ApiError } from '@/lib/api-error';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { TaskWithDetails } from '@/lib/services/entities/task.service';

interface UseTaskActionsProps {
  userToken?: string;
  onTaskUpdate?: (taskId: string, updates: Partial<TaskWithDetails>) => void;
  onTaskAdd?: (task: TaskWithDetails) => void;
  onTaskRemove?: (taskId: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: Error | null) => void;
}

export function useTaskActions({
  userToken,
  onTaskUpdate,
  onTaskAdd,
  onTaskRemove,
  onLoadingChange,
  onError,
}: UseTaskActionsProps = {}) {
  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: TaskStatus
  ): Promise<void> => {
    const requestId = Math.random().toString(36).substring(7);

    // Filter out unsupported status values
    if (['failed', 'overdue'].includes(status)) {
      logger.warn('useTaskActions: unsupported status for update', {
        taskId,
        status,
        requestId,
      });
      return;
    }

    logger.info('useTaskActions: updating task status', {
      taskId,
      newStatus: status,
      requestId,
    });

    try {
      onLoadingChange?.(true);

      const updateData: UpdateTaskRequest = {
        id: taskId,
        title: null,
        description: null,
        priority: null,
        status: status as TaskStatus,
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
        technician_id: null
      };
      const result = await taskService.updateTask(taskId, updateData);

      if (result.error) {
        logger.error('useTaskActions: TaskService returned error for status update', {
          taskId,
          status,
          error: result.error,
          requestId,
        });
        throw result.error;
      }

      const updatedTask = result.data!;
      onTaskUpdate?.(taskId, updatedTask);

      const statusLabels = {
        pending: 'En attente',
        in_progress: 'En cours',
        completed: 'Terminée',
        cancelled: 'Annulée'
      };

      logger.info('useTaskActions: task status updated successfully', {
        taskId,
        newStatus: status,
        requestId,
      });

      toast.success(`Statut de la tâche mis à jour : ${statusLabels[status as keyof typeof statusLabels] || status}`);
    } catch (err) {
      logger.error('useTaskActions: failed to update task status', {
        taskId,
        status,
        error: err instanceof Error ? err.message : String(err),
        requestId,
      });

      let errorMessage = 'Échec de la mise à jour du statut de la tâche';
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage || 'Unknown error'));
      throw err;
    } finally {
      onLoadingChange?.(false);
    }
  }, [onTaskUpdate, onLoadingChange, onError]);

  const updateTask = useCallback(async (
    taskId: string,
    updates: Partial<TaskWithDetails>
  ) => {
    if (!userToken) {
      throw new Error('Authentication required');
    }

    try {
      onLoadingChange?.(true);
      onError?.(null);

      // Convert TaskWithDetails updates to UpdateTaskRequest format
      const updateData: UpdateTaskRequest & Record<string, unknown> = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.vehicle_plate !== undefined) updateData.vehicle_plate = updates.vehicle_plate;
      if (updates.vehicle_model !== undefined) updateData.vehicle_model = updates.vehicle_model;
      if (updates.vehicle_year !== undefined) updateData.vehicle_year = updates.vehicle_year;
      if (updates.vehicle_make !== undefined) updateData.vehicle_make = updates.vehicle_make;
      if (updates.vin !== undefined) updateData.vin = updates.vin;
      if (updates.ppf_zones !== undefined) updateData.ppf_zones = updates.ppf_zones;
      if (updates.custom_ppf_zones !== undefined) updateData.custom_ppf_zones = updates.custom_ppf_zones;
      if (updates.client_id !== undefined) updateData.client_id = updates.client_id;
      if (updates.customer_name !== undefined) updateData.customer_name = updates.customer_name;
      if (updates.customer_email !== undefined) updateData.customer_email = updates.customer_email;
      if (updates.customer_phone !== undefined) updateData.customer_phone = updates.customer_phone;
      if (updates.customer_address !== undefined) updateData.customer_address = updates.customer_address;
      if (updates.external_id !== undefined) updateData.external_id = updates.external_id;
      if (updates.lot_film !== undefined) updateData.lot_film = updates.lot_film;
      if (updates.checklist_completed !== undefined) updateData.checklist_completed = updates.checklist_completed;
      if (updates.scheduled_date !== undefined) updateData.scheduled_date = updates.scheduled_date;
      if (updates.start_time !== undefined) updateData.start_time = updates.start_time;
      if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
      if (updates.date_rdv !== undefined) updateData.date_rdv = updates.date_rdv;
      if (updates.heure_rdv !== undefined) updateData.heure_rdv = updates.heure_rdv;
      if (updates.template_id !== undefined) updateData.template_id = updates.template_id;
      if (updates.workflow_id !== undefined) updateData.workflow_id = updates.workflow_id;
      if (updates.estimated_duration !== undefined) updateData.estimated_duration = updates.estimated_duration;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.technician_id !== undefined) updateData.technician_id = updates.technician_id;

      const result = await taskService.updateTask(taskId, updateData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }

      // Update the task in the local state
      onTaskUpdate?.(taskId, updates);

      toast.success('Tâche mise à jour avec succès');
      logger.info('Task updated', { taskId, updates });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update task');
      onError?.(error);
      toast.error(`Échec de la mise à jour de la tâche : ${error.message}`);
      logger.error('Task update failed', { taskId, error: error.message });
      throw error;
    } finally {
      onLoadingChange?.(false);
    }
  }, [userToken, onTaskUpdate, onLoadingChange, onError]);

  const deleteTask = useCallback(async (taskId: string) => {
    const requestId = Math.random().toString(36).substring(7);

    logger.info('useTaskActions: deleting task', {
      taskId,
      requestId,
    });

    try {
      onLoadingChange?.(true);

      await taskService.deleteTask(taskId);

      onTaskRemove?.(taskId);

      logger.info('useTaskActions: task deleted successfully', {
        taskId,
        requestId,
      });

      toast.success('Tâche supprimée avec succès');
      return true;
    } catch (err) {
      logger.error('useTaskActions: failed to delete task', {
        taskId,
        error: err instanceof Error ? err.message : String(err),
        requestId,
      });

      let errorMessage = 'Failed to delete task';
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage || 'Unknown error'));
      throw err;
    } finally {
      onLoadingChange?.(false);
    }
  }, [onTaskRemove, onLoadingChange, onError]);

  const createTask = useCallback(async (taskData: Partial<TaskWithDetails>) => {
    const requestId = Math.random().toString(36).substring(7);

    logger.info('useTaskActions: creating new task', {
      taskDataKeys: Object.keys(taskData),
      requestId,
    });

    try {
      onLoadingChange?.(true);

      // Check if user is authenticated
      if (!userToken) {
        const errorMsg = 'Authentication required. You must be logged in to create a task. Please log in and try again.';
        logger.error('useTaskActions: authentication failed for create', {
          error: errorMsg,
          requestId,
        });
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Convert null values to undefined for schema compatibility
      const sanitizedTaskData = Object.fromEntries(
        Object.entries(taskData).map(([key, value]) => [key, value === null ? undefined : value])
      );

      logger.info('useTaskActions: calling TaskService for create', {
        requestId,
      });

      const result = await taskService.createTask(sanitizedTaskData as Record<string, unknown>);

      if (!result.success) {
        logger.error('useTaskActions: TaskService returned error for create', {
          error: result.error,
          requestId,
        });
        throw new Error(result.error);
      }

      const newTask = result.data;

      if (!newTask) {
        throw new Error('Task creation failed: no data returned');
      }

      logger.info('useTaskActions: task created successfully', {
        taskId: newTask!.id,
        taskTitle: (newTask as Record<string, unknown>).title,
        requestId,
      });

      // Add the new task to the current tasks immediately for better UX
      onTaskAdd?.(newTask! as TaskWithDetails);

      toast.success('Tâche créée avec succès');
      return newTask;
    } catch (err) {
      logger.error('useTaskActions: failed to create task', {
        error: err instanceof Error ? err.message : String(err),
        requestId,
      });

      let errorMessage = 'Failed to create task';
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage || 'Unknown error'));
      throw err;
    } finally {
      onLoadingChange?.(false);
    }
  }, [userToken, onTaskAdd, onLoadingChange, onError]);

  const updateTaskPriority = useCallback(async (_taskId: string, _priority: string): Promise<void> => {
    // Priority updates are not supported in the current TaskWithDetails interface
    console.warn('Priority updates are not currently supported');
    return;
  }, []);

  return {
    updateTaskStatus,
    updateTask,
    deleteTask,
    createTask,
    updateTaskPriority,
  };
}