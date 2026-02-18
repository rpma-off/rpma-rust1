// Task Workflow Sync Service
import { ipcClient } from '@/lib/ipc/client';
import { taskService } from '@/domains/tasks/server';
import type { Intervention } from '@/lib/backend';
import type { TaskWithDetails } from '@/types/task.types';

interface ActiveInterventionResponse {
  type: string;
  intervention?: Intervention | null;
}

export interface TaskWithWorkflowProgress {
  task: TaskWithDetails;
  intervention?: Intervention;
  workflowProgress?: {
    currentStep: number;
    totalSteps: number;
    completionPercentage: number;
    status: string;
  };
  isSynced: boolean;
  lastSyncTime?: Date;
}

export class TaskWorkflowSyncService {
  /**
   * Sync a specific task with its associated workflow/intervention
   */
  static async syncTaskWithWorkflow(taskId: string): Promise<TaskWithWorkflowProgress> {
    try {
      // Get the task details
      const taskResponse = await taskService.getTaskById(taskId);
      if (!taskResponse.success || !taskResponse.data) {
        throw new Error(`Failed to get task ${taskId}: ${taskResponse.error || 'Unknown error'}`);
      }

      const task = taskResponse.data;

      // Get the active intervention for this task
      const interventionResponse = await ipcClient.interventions.getActiveByTask(taskId, '') as ActiveInterventionResponse;
      if (!interventionResponse || interventionResponse.type !== 'ActiveRetrieved' || !interventionResponse.intervention) {
        // No active intervention, return task with sync status
        return {
          task,
          isSynced: true,
          lastSyncTime: new Date()
        };
      }

      const intervention = interventionResponse.intervention;

      // Get workflow progress
      const progressResponse = await ipcClient.interventions.getProgress(intervention.id, '');
      if (!progressResponse || !progressResponse.steps) {
        throw new Error(`Failed to get progress for intervention ${intervention.id}`);
      }

      const progress = progressResponse;

      // Calculate workflow progress
      const workflowProgress = {
        currentStep: progress.steps?.length || 0,
        totalSteps: progress.steps?.length || 1,
        completionPercentage: progress.progress_percentage || 0,
        status: progress.progress_percentage === 100 ? 'completed' : 'in_progress'
      };

      return {
        task,
        intervention,
        workflowProgress,
        isSynced: true,
        lastSyncTime: new Date()
      };

    } catch (error) {
      console.error('Error syncing task with workflow:', error);
      throw error;
    }
  }

  /**
   * Sync all tasks with their associated workflows
   */
  static async syncAllTasksWithWorkflows(): Promise<TaskWithWorkflowProgress[]> {
    try {
      // Get all tasks (you might want to add pagination/filtering)
      const tasksResponse = await taskService.getTasks();
      if (!tasksResponse.success || !tasksResponse.data) {
        throw new Error(`Failed to get tasks: ${tasksResponse.error || 'Unknown error'}`);
      }

      const tasks = tasksResponse.data.data || [];
      const results: TaskWithWorkflowProgress[] = [];

      // Sync each task (consider batching for performance)
      for (const task of tasks) {
        try {
          const syncedTask = await this.syncTaskWithWorkflow(task.id);
          results.push(syncedTask);
        } catch (error) {
          console.error(`Failed to sync task ${task.id}:`, error);
          // Continue with other tasks even if one fails
          results.push({
            task,
            isSynced: false,
            lastSyncTime: new Date()
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Error syncing all tasks with workflows:', error);
      throw error;
    }
  }

  /**
   * Get a task with its current workflow progress
   */
  static async getTaskWithWorkflowProgress(taskId: string): Promise<TaskWithWorkflowProgress> {
    return this.syncTaskWithWorkflow(taskId);
  }
}

export const taskWorkflowSyncService = TaskWorkflowSyncService;

