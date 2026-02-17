import { useState, useEffect, useCallback } from 'react';
import { statusApi } from '@/lib/ipc/status';
import { taskOperations } from '@/lib/ipc/domains/tasks';
import type { StatusDistribution, Task, TaskQuery } from '@/lib/backend';
import { toast } from 'sonner';

export function useTaskStatus() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<StatusDistribution | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all tasks for Kanban board - in a real app you might want to add filters
      const query: Partial<TaskQuery> = {};
      const result = await taskOperations.list(query, 'dummy-session-token');
      setTasks(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDistribution = useCallback(async () => {
    try {
      const data = await statusApi.getStatusDistribution('dummy-session-token');
      setDistribution(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load status distribution';
      setError(message);
      toast.error(message);
    }
  }, []);

  const transitionStatus = useCallback(async (
    taskId: string,
    newStatus: string,
    reason?: string
  ) => {
    try {
      const result = await statusApi.transitionStatus({
        task_id: taskId,
        new_status: newStatus,
        reason: reason || null,
        correlation_id: null,
      }, 'dummy-session-token');

      toast.success(`Task status updated to ${newStatus}`);
      await fetchTasks(); // Refresh tasks
      await fetchDistribution(); // Refresh distribution
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update task status';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [fetchTasks, fetchDistribution]);

  useEffect(() => {
    fetchTasks();
    fetchDistribution();
  }, [fetchTasks, fetchDistribution]);

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
