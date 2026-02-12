import { useEffect, useCallback } from 'react';
import { useWebSocket } from '../lib/websocket';
import { useTasks } from './useTasks';
import { toast } from 'sonner';
import { logger, LogDomain } from '../lib/logging';
import type { TaskStatus } from '@/lib/backend';

interface UseRealTimeUpdatesOptions {
  enableTaskUpdates?: boolean;
  enableInterventionUpdates?: boolean;
  enableClientUpdates?: boolean;
  enableNotifications?: boolean;
}

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const {
    enableTaskUpdates = true,
    enableInterventionUpdates = true,
    enableClientUpdates = true,
    enableNotifications = true,
  } = options;

  // Get access to existing hooks for state updates
  const { updateTask } = useTasks({
    autoFetch: false, // We don't want to fetch, just get the update functions
  });

  // WebSocket event handlers
  const wsHandlers = {
    onTaskCreated: useCallback((task: Record<string, unknown>) => {
      if (!enableTaskUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Task created', task);
      toast.success(`New task created: ${(task.title as string) || 'Unknown'}`);
    }, [enableTaskUpdates]),

    onTaskUpdated: useCallback((taskId: string, updates: Record<string, unknown>) => {
      if (!enableTaskUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Task updated', { taskId, updates });
      // Update local state optimistically
      updateTask(taskId, { status: updates.status as TaskStatus }).catch(err => {
        logger.warn(LogDomain.TASK, 'Failed to update task from real-time event', err);
      });
    }, [enableTaskUpdates, updateTask]),

    onTaskDeleted: useCallback((taskId: string) => {
      if (!enableTaskUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Task deleted', { taskId });
      toast.info('A task was deleted');
    }, [enableTaskUpdates]),

    onTaskStatusChanged: useCallback((taskId: string, oldStatus: string, newStatus: string) => {
      if (!enableTaskUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Task status changed', { taskId, oldStatus, newStatus });
      // Update local state
      updateTask(taskId, { status: newStatus as TaskStatus }).catch(err => {
        logger.warn(LogDomain.TASK, 'Failed to update task status from real-time event', err);
      });
      toast.info(`Task status changed from ${oldStatus} to ${newStatus}`);
    }, [enableTaskUpdates, updateTask]),

    onInterventionStarted: useCallback((interventionId: string, taskId: string) => {
      if (!enableInterventionUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Intervention started', { interventionId, taskId });
      toast.success('Intervention started for task');
    }, [enableInterventionUpdates]),

    onInterventionUpdated: useCallback((interventionId: string, updates: Record<string, unknown>) => {
      if (!enableInterventionUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Intervention updated', { interventionId, updates });
    }, [enableInterventionUpdates]),

    onInterventionCompleted: useCallback((interventionId: string) => {
      if (!enableInterventionUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Intervention completed', { interventionId });
      toast.success('Intervention completed successfully');
    }, [enableInterventionUpdates]),

    onInterventionStepAdvanced: useCallback((interventionId: string, stepNumber: number) => {
      if (!enableInterventionUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Intervention step advanced', { interventionId, stepNumber });
      toast.info(`Intervention advanced to step ${stepNumber}`);
    }, [enableInterventionUpdates]),

    onClientCreated: useCallback((client: Record<string, unknown>) => {
      if (!enableClientUpdates) return;
      logger.info(LogDomain.CLIENT, 'Real-time: Client created', client);
      toast.success(`New client added: ${(client.name as string) || 'Unknown'}`);
    }, [enableClientUpdates]),

    onClientUpdated: useCallback((clientId: string, updates: Record<string, unknown>) => {
      if (!enableClientUpdates) return;
      logger.info(LogDomain.CLIENT, 'Real-time: Client updated', { clientId, updates });
    }, [enableClientUpdates]),

    onClientDeleted: useCallback((clientId: string) => {
      if (!enableClientUpdates) return;
      logger.info(LogDomain.CLIENT, 'Real-time: Client deleted', { clientId });
      toast.info('A client was removed');
    }, [enableClientUpdates]),

    onNotification: useCallback((title: string, message: string, level: string) => {
      if (!enableNotifications) return;
      logger.info(LogDomain.SYSTEM, 'Real-time: System notification', { title, message, level });

      switch (level) {
        case 'error':
          toast.error(`${title}: ${message}`);
          break;
        case 'warning':
          toast.warning(`${title}: ${message}`);
          break;
        case 'success':
          toast.success(`${title}: ${message}`);
          break;
        default:
          toast(`${title}: ${message}`);
      }
    }, [enableNotifications]),

    onConnected: useCallback(() => {
      logger.info(LogDomain.SYSTEM, 'Real-time: WebSocket connected');
      toast.success('Real-time updates connected');
    }, []),

    onDisconnected: useCallback(() => {
      logger.warn(LogDomain.SYSTEM, 'Real-time: WebSocket disconnected');
      toast.warning('Real-time updates disconnected - working offline');
    }, []),

    onError: useCallback((error: Event) => {
      logger.error(LogDomain.SYSTEM, 'Real-time: WebSocket error', error);
      toast.error('Real-time connection error');
    }, []),
  };

  // Initialize WebSocket connection
  const { client, isConnected } = useWebSocket(wsHandlers);

  // Auto-initialize WebSocket server when component mounts
  useEffect(() => {
    const initWSServer = async () => {
      try {
        // Import the IPC client dynamically to avoid circular dependencies
        const { invoke } = await import('@tauri-apps/api/core');

        // Initialize WebSocket server on backend
        await invoke('init_websocket_server', {
          port: 8080,
        });

        logger.info(LogDomain.SYSTEM, 'WebSocket server initialized');
      } catch (error) {
        logger.error(LogDomain.SYSTEM, 'Failed to initialize WebSocket server', error);
      }
    };

    initWSServer();
  }, []);

  return {
    isConnected,
    client,
  };
}

// Hook for broadcasting real-time updates from the frontend
export function useRealTimeBroadcast() {
  const broadcastTaskUpdate = useCallback(async (
    taskId: string,
    updateType: string,
    data: Record<string, unknown>
  ) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('broadcast_task_update', {
        taskId,
        updateType,
        data,
      });
      } catch (error) {
        logger.error(LogDomain.TASK, 'Failed to broadcast task update', error);
      }
  }, []);

  const broadcastInterventionUpdate = useCallback(async (
    interventionId: string,
    updateType: string,
    data: Record<string, unknown>
  ) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('broadcast_intervention_update', {
        interventionId,
        updateType,
        data,
      });
      } catch (error) {
        logger.error(LogDomain.TASK, 'Failed to broadcast intervention update', error);
      }
  }, []);

  const broadcastClientUpdate = useCallback(async (
    clientId: string,
    updateType: string,
    data: Record<string, unknown>
  ) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('broadcast_client_update', {
        clientId,
        updateType,
        data,
      });
      } catch (error) {
        logger.error(LogDomain.CLIENT, 'Failed to broadcast client update', error);
      }
  }, []);

  const broadcastNotification = useCallback(async (
    title: string,
    message: string,
    level: string = 'info'
  ) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('broadcast_system_notification', {
        title,
        message,
        level,
      });
      } catch (error) {
        logger.error(LogDomain.SYSTEM, 'Failed to broadcast notification', error);
      }
  }, []);

  return {
    broadcastTaskUpdate,
    broadcastInterventionUpdate,
    broadcastClientUpdate,
    broadcastNotification,
  };
}

// Specialized hooks for different domains
export function useDashboardRealTime() {
  return useRealTimeUpdates({
    enableTaskUpdates: true,
    enableInterventionUpdates: true,
    enableClientUpdates: true,
    enableNotifications: true,
  });
}

export function useTaskRealTime() {
  return useRealTimeUpdates({
    enableTaskUpdates: true,
    enableInterventionUpdates: true,
    enableClientUpdates: false,
    enableNotifications: false,
  });
}

export function useSOPRealTime() {
  return useRealTimeUpdates({
    enableTaskUpdates: false,
    enableInterventionUpdates: true,
    enableClientUpdates: false,
    enableNotifications: false,
  });
}


