import { useEffect, useCallback } from 'react';
import { useWebSocket } from '@/lib/websocket';
import { useTasks } from '@/domains/tasks';
import { toast } from 'sonner';
import { logger, LogDomain } from '@/lib/logging';
import { safeInvoke } from '@/lib/ipc/utils';
import type { TaskStatus } from '@/lib/backend';
import type { JsonObject } from '@/types/json';
import { useAuth } from '@/domains/auth/api/useAuth';

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
  const { user } = useAuth();

  // Get access to existing hooks for state updates
  const { updateTask } = useTasks({
    autoFetch: false, // We don't want to fetch, just get the update functions
  });

  // WebSocket event handlers
  const wsHandlers = {
    onTaskCreated: useCallback((task: Record<string, unknown>) => {
      if (!enableTaskUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Task created', task);
      toast.success(`Nouvelle tâche créée : ${(task.title as string) || 'Inconnue'}`);
    }, [enableTaskUpdates]),

    onTaskUpdated: useCallback((taskId: string, updates: Record<string, unknown>) => {
      if (!enableTaskUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Task updated', { taskId, updates });
      // Update local state optimistically
      updateTask(taskId, { status: updates.status as TaskStatus }).catch((err: unknown) => {
        logger.warn(LogDomain.TASK, 'Failed to update task from real-time event', { err });
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
      updateTask(taskId, { status: newStatus as TaskStatus }).catch((err: unknown) => {
        logger.warn(LogDomain.TASK, 'Failed to update task status from real-time event', { err });
      });
      toast.info(`Task status changed from ${oldStatus} to ${newStatus}`);
    }, [enableTaskUpdates, updateTask]),

    onInterventionStarted: useCallback((interventionId: string, taskId: string) => {
      if (!enableInterventionUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Intervention started', { interventionId, taskId });
      toast.success('Intervention démarrée pour la tâche');
    }, [enableInterventionUpdates]),

    onInterventionUpdated: useCallback((interventionId: string, updates: Record<string, unknown>) => {
      if (!enableInterventionUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Intervention updated', { interventionId, updates });
    }, [enableInterventionUpdates]),

    onInterventionCompleted: useCallback((interventionId: string) => {
      if (!enableInterventionUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Intervention completed', { interventionId });
      toast.success('Intervention terminée avec succès');
    }, [enableInterventionUpdates]),

    onInterventionStepAdvanced: useCallback((interventionId: string, stepNumber: number) => {
      if (!enableInterventionUpdates) return;
      logger.info(LogDomain.TASK, 'Real-time: Intervention step advanced', { interventionId, stepNumber });
      toast.info(`Intervention advanced to step ${stepNumber}`);
    }, [enableInterventionUpdates]),

    onClientCreated: useCallback((client: Record<string, unknown>) => {
      if (!enableClientUpdates) return;
      logger.info(LogDomain.CLIENT, 'Real-time: Client created', client);
      toast.success(`Nouveau client ajouté : ${(client.name as string) || 'Inconnu'}`);
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
      toast.success('Mises à jour en temps réel connectées');
    }, []),

    onDisconnected: useCallback(() => {
      logger.warn(LogDomain.SYSTEM, 'Real-time: WebSocket disconnected');
      toast.warning('Real-time updates disconnected - working offline');
    }, []),

    onError: useCallback((error: Event) => {
      logger.error(LogDomain.SYSTEM, 'Real-time: WebSocket error', error);
      toast.error('Erreur de connexion en temps réel');
    }, []),
  };

  // Initialize WebSocket connection
  const { client, isConnected } = useWebSocket(wsHandlers);

  // Auto-initialize WebSocket server when component mounts
  useEffect(() => {
    const initWSServer = async () => {
      try {
        // Initialize WebSocket server on backend
        await safeInvoke<void>('init_websocket_server', {
          session_token: user?.token ?? '',
          port: 8080,
        });

        logger.info(LogDomain.SYSTEM, 'WebSocket server initialized');
      } catch (error) {
        logger.error(LogDomain.SYSTEM, 'Failed to initialize WebSocket server', error);
      }
    };

    initWSServer();
  }, [user?.token]);

  return {
    isConnected,
    client,
  };
}

// Hook for broadcasting real-time updates from the frontend
export function useRealTimeBroadcast() {
  const { user } = useAuth();
  const broadcastTaskUpdate = useCallback(async (
    taskId: string,
    updateType: string,
    data: Record<string, unknown>
  ) => {
    try {
      await safeInvoke<void>('broadcast_task_update', {
        session_token: user?.token ?? '',
        taskId,
        updateType,
        data: data as JsonObject,
      });
      } catch (error) {
        logger.error(LogDomain.TASK, 'Failed to broadcast task update', error);
      }
  }, [user?.token]);

  const broadcastInterventionUpdate = useCallback(async (
    interventionId: string,
    updateType: string,
    data: Record<string, unknown>
  ) => {
    try {
      await safeInvoke<void>('broadcast_intervention_update', {
        session_token: user?.token ?? '',
        interventionId,
        updateType,
        data: data as JsonObject,
      });
      } catch (error) {
        logger.error(LogDomain.TASK, 'Failed to broadcast intervention update', error);
      }
  }, [user?.token]);

  const broadcastClientUpdate = useCallback(async (
    clientId: string,
    updateType: string,
    data: Record<string, unknown>
  ) => {
    try {
      await safeInvoke<void>('broadcast_client_update', {
        session_token: user?.token ?? '',
        clientId,
        updateType,
        data: data as JsonObject,
      });
      } catch (error) {
        logger.error(LogDomain.CLIENT, 'Failed to broadcast client update', error);
      }
  }, [user?.token]);

  const broadcastNotification = useCallback(async (
    title: string,
    message: string,
    level: string = 'info'
  ) => {
    try {
      await safeInvoke<void>('broadcast_system_notification', {
        session_token: user?.token ?? '',
        title,
        message,
        level,
      });
      } catch (error) {
        logger.error(LogDomain.SYSTEM, 'Failed to broadcast notification', error);
      }
  }, [user?.token]);

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
