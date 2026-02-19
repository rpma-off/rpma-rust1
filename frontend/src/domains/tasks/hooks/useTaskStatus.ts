import { useState, useEffect, useCallback } from 'react';
import { statusApi } from '@/lib/ipc/status';
import { useAuth } from '@/domains/auth';
import { taskIpc } from '../ipc/task.ipc';
import type { StatusDistribution, Task, TaskQuery } from '@/lib/backend';
import { toast } from 'sonner';

export function useTaskStatus() {
  const { user } = useAuth();
  const sessionToken = user?.token;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<StatusDistribution | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!sessionToken) {
        setTasks([]);
        setError('Authentication required');
        return;
      }
      // Fetch all tasks for Kanban board - in a real app you might want to add filters
      const query: Partial<TaskQuery> = {};
      const result = await taskIpc.list(query, sessionToken);
      setTasks(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  const fetchDistribution = useCallback(async () => {
    try {
      if (!sessionToken) {
        setDistribution(null);
        setError('Authentication required');
        return;
      }
      const data = await statusApi.getStatusDistribution(sessionToken);
      setDistribution(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load status distribution';
      setError(message);
      toast.error(message);
    }
  }, [sessionToken]);

  const transitionStatus = useCallback(async (
    taskId: string,
    newStatus: string,
    reason?: string
  ) => {
    try {
      if (!sessionToken) {
        const message = 'Authentication required';
        toast.error(message);
        return { success: false, error: message };
      }
      const result = await statusApi.transitionStatus({
        task_id: taskId,
        new_status: newStatus,
        reason: reason || null,
        correlation_id: null,
      }, sessionToken);

      toast.success(`Task status updated to ${newStatus}`);
      await fetchTasks(); // Refresh tasks
      await fetchDistribution(); // Refresh distribution
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update task status';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [fetchDistribution, fetchTasks, sessionToken]);

  useEffect(() => {
    fetchTasks();
    fetchDistribution();
  }, [fetchDistribution, fetchTasks]);

  return {
    tasks,
    loading,
    error,
    distribution,
    transitionStatus,
    refetchTasks: fetchTasks,
    refetchDistribution: fetchDistribution,
  };
}
