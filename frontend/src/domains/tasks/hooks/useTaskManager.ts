import { useCallback, useEffect, useState } from 'react';
import { convertTimestamps } from '@/lib/types';
import { UpdateTaskRequest, CreateTaskRequest } from '@/lib/backend';
import { ipcClient } from '@/lib/ipc';
import { handleError } from '@/lib/utils/error-handler';
import { LogDomain } from '@/lib/logging/types';
import { Task, Client } from '@/types';
import { useAuth } from '@/shared/hooks/useAuth';

export interface TaskWithClient extends Task {
  client_name?: string;
}

export function useTaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.token) {
      setTasks([]);
      setClients([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [tasksResult, clientsResult] = await Promise.all([
        ipcClient.tasks.list({
          page: 1,
          limit: 100,
          status: null,
          technician_id: null,
          client_id: null,
          priority: null,
          search: null,
          from_date: null,
          to_date: null,
          sort_by: 'created_at',
          sort_order: 'desc',
        }),
        ipcClient.clients.list({
          page: 1,
          limit: 100,
          sort_by: 'created_at',
          sort_order: 'desc',
        }),
      ]);

      const convertedTasks = tasksResult.data.map((task) => convertTimestamps(task));
      const convertedClients = clientsResult.data.map((client) => convertTimestamps(client));

      const clientNamesById = new Map(
        convertedClients.map((client) => [client.id, client.name]),
      );

      const tasksWithClients = convertedTasks.map((task) => ({
        ...task,
        client_name: clientNamesById.get(task.client_id ?? '') || 'Client inconnu',
      })) as TaskWithClient[];

      setTasks(tasksWithClients);
      setClients(convertedClients as Client[]);
    } catch (error) {
      handleError(error, 'Failed to load tasks and clients', {
        domain: LogDomain.TASK,
        userId: user?.user_id,
        component: 'TaskManager',
        toastMessage: 'Erreur lors du chargement des données',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.token, user?.user_id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTask = useCallback(
    async (taskData: CreateTaskRequest) => {
      try {
        await ipcClient.tasks.create(taskData);
        await refresh();
      } catch (error) {
        handleError(error, 'Task creation failed', {
          domain: LogDomain.TASK,
          userId: user?.user_id,
          component: 'TaskManager',
          toastMessage: 'Erreur lors de la création de la tâche',
        });
        throw error;
      }
    },
    [refresh, user?.user_id],
  );

  const updateTask = useCallback(
    async (taskId: string, updateData: UpdateTaskRequest) => {
      try {
        await ipcClient.tasks.update(taskId, updateData);
        await refresh();
      } catch (error) {
        handleError(error, 'Task update failed', {
          domain: LogDomain.TASK,
          userId: user?.user_id,
          component: 'TaskManager',
          toastMessage: 'Erreur lors de la mise à jour de la tâche',
        });
        throw error;
      }
    },
    [refresh, user?.user_id],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        await ipcClient.tasks.delete(taskId);
        await refresh();
      } catch (error) {
        handleError(error, 'Task deletion failed', {
          domain: LogDomain.TASK,
          userId: user?.user_id,
          component: 'TaskManager',
          toastMessage: 'Erreur lors de la suppression de la tâche',
        });
        throw error;
      }
    },
    [refresh, user?.user_id],
  );

  return {
    tasks,
    clients,
    isLoading,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    user,
  };
}
