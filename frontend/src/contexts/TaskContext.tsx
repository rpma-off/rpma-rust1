'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { TaskStatus, TaskPriority, UpdateTaskRequest } from '@/lib/backend';
import { TaskWithDetails } from '@/types/task.types';
import { useTasks } from '@/hooks/useTasks';
import { TaskService } from '@/lib/services/entities/task.service';

interface TaskContextType extends ReturnType<typeof useTasks> {
  // Additional context-specific methods can be added here
  getTaskById: (id: string) => TaskWithDetails | undefined;
  fetchTaskById: (id: string) => Promise<TaskWithDetails | null>;
  updateTaskProgress: (taskId: string, progress: number) => Promise<void>;
  bulkUpdateTasks: (taskIds: string[], updates: Partial<TaskWithDetails>) => Promise<{ success: boolean; updatedCount: number; failedCount: number }>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: React.ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({
  children,
}) => {
  const tasksData = useTasks();
  const { tasks, updateTask, refetch } = tasksData;

  const getTaskById = useCallback((id: string): TaskWithDetails | undefined => {
    return tasks.find(task => task.id === id);
  }, [tasks]);

  const fetchTaskById = useCallback(async (id: string): Promise<TaskWithDetails | null> => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch task');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch task by ID:', err);
      return null;
    }
  }, []);



  const updateTaskProgress = useCallback(async () => {
    // Progress updates are not currently supported in the TaskWithDetails interface
    console.warn('Progress updates are not currently supported');
    return;
  }, []);

  const bulkUpdateTasks = useCallback(async (taskIds: string[], updates: Partial<TaskWithDetails>) => {
    try {
      const taskService = TaskService.getInstance();

      // Update tasks one by one
      const updatePromises = taskIds.map(taskId =>
        taskService.updateTask(taskId, updates as UpdateTaskRequest)
      );

      const results = await Promise.allSettled(updatePromises);

      // Check for failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`${failures.length} out of ${taskIds.length} bulk updates failed`);
      }

      // Refetch tasks to update the UI
      await refetch();

      return {
        success: failures.length === 0,
        updatedCount: results.length - failures.length,
        failedCount: failures.length
      };
    } catch (err) {
      console.error('Failed to bulk update tasks:', err);
      throw err;
    }
  }, [refetch]);

  const value = {
    ...tasksData,
    getTaskById,
    fetchTaskById,
    updateTaskProgress,
    bulkUpdateTasks,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

// Higher Order Component for class components
export const withTaskContext = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const WithTaskContext: React.FC<P> = (props) => (
    <TaskProvider>
      <WrappedComponent {...props as P} />
    </TaskProvider>
  );
  return WithTaskContext;
};

// Helper hooks for common operations
export const useTask = (taskId: string) => {
  const { getTaskById } = useTaskContext();
  return getTaskById(taskId);
};

export const useTaskStatus = (taskId: string) => {
  const task = useTask(taskId);
  return task?.status;
};

export const useTaskProgress = (taskId: string) => {
  const task = useTask(taskId);
  return task?.workflow_status === 'completed' ? 100 : task?.workflow_status === 'in_progress' ? 50 : 0;
};

export const useTaskAssignment = (taskId: string) => {
  const task = useTask(taskId);
  return task?.technician_id;
};

export const useTaskFilters = () => {
  const { 
    filters, 
    setStatusFilter, 
    setPriorityFilter, 
    setSearchQuery,
    updateFilters
  } = useTaskContext();
  
  return {
    status: filters?.status as TaskStatus | 'all' || 'all',
    priority: filters?.priority as TaskPriority | 'all' || 'all',
    searchQuery: filters?.search || '',
    setStatusFilter,
    setPriorityFilter,
    setSearchQuery,
    updateFilters
  };
};

export const useTaskActions = () => {
  const { 
    createTask, 
    updateTask, 
    deleteTask, 
    updateTaskStatus, 
    updateTaskProgress,
    bulkUpdateTasks
  } = useTaskContext();
  
  return {
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskProgress,
    bulkUpdateTasks
  };
};

export default TaskContext;