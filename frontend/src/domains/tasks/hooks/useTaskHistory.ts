import { useQuery } from '@tanstack/react-query';
import { taskKeys } from '@/lib/query-keys';
import { useAuth } from '@/shared/hooks/useAuth';
import { taskGateway } from '../api/taskGateway';
import type { TaskHistoryEntry } from '../api/types';

/**
 * Hook to fetch task history
 */
export function useTaskHistory(taskId: string) {
  const { user } = useAuth();

  return useQuery<TaskHistoryEntry[]>({
    queryKey: taskKeys.history(taskId),
    queryFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return taskGateway.getTaskHistory(taskId);
    },
    enabled: !!user?.token && !!taskId
  });
}
