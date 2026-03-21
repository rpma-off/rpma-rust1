import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/lib/query-keys';
import type { UpdateTaskRequest } from '@/lib/backend';
import { useAuth } from '@/shared/hooks/useAuth';
import type { JsonObject } from '@/types/json';
import { taskIpc } from '../ipc/task.ipc';

/**
 * Hook providing common task mutations with automatic cache invalidation.
 *
 * ## Mutation guide
 * - `updateTask` — typed CRUD update via `task_update` IPC command (prefer this)
 * - `editTask`   — field-restricted update via the dedicated `edit_task` IPC
 *                  command; used when the caller holds a raw `JsonObject`
 *                  (e.g. form payloads not yet typed as UpdateTaskRequest)
 *
 * ## Auth invariant
 * All mutations require an authenticated session.  The `requireToken` helper
 * below enforces this once; do not duplicate the check in individual
 * `mutationFn`s.
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /** Throws a typed error if the session token is absent. */
  function requireToken(): string {
    if (!user?.token) throw new Error('Utilisateur non authentifié');
    return user.token;
  }

  const invalidateTask = (taskId: string) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.byId(taskId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  };

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: UpdateTaskRequest }) => {
      requireToken();
      return taskIpc.update(taskId, data);
    },
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.byId(taskId) });
      const previous = queryClient.getQueryData(taskKeys.byId(taskId));
      if (previous && typeof previous === 'object') {
        const patch: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            patch[key] = value;
          }
        }
        queryClient.setQueryData(taskKeys.byId(taskId), { ...(previous as Record<string, unknown>), ...patch });
      }
      return { previous, taskId };
    },
    onError: (err: unknown, { taskId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(taskKeys.byId(taskId), context.previous);
      }
      console.error('[useTaskMutations] updateTask failed:', err);
    },
    onSettled: (_, __, { taskId }) => invalidateTask(taskId),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      requireToken();
      return taskIpc.delete(taskId);
    },
    onSuccess: (_, taskId) => {
      queryClient.removeQueries({ queryKey: taskKeys.byId(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: (err: unknown) => {
      console.error('[useTaskMutations] deleteTask failed:', err);
    },
  });

  const editTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: JsonObject }) => {
      requireToken();
      return taskIpc.editTask(taskId, data);
    },
    onSuccess: (_, { taskId }) => invalidateTask(taskId),
    onError: (err: unknown) => {
      console.error('[useTaskMutations] editTask failed:', err);
    },
  });

  const reportIssueMutation = useMutation({
    mutationFn: async ({
      taskId,
      issueType,
      severity,
      description
    }: {
      taskId: string;
      issueType: string;
      severity: string;
      description: string;
    }) => {
      requireToken();
      return taskIpc.reportTaskIssue(taskId, issueType, severity, description);
    },
    onSuccess: (_, { taskId }) => invalidateTask(taskId),
    onError: (err: unknown) => {
      console.error('[useTaskMutations] reportIssue failed:', err);
    },
  });

  const delayTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      newDate,
      reason
    }: {
      taskId: string;
      newDate: string;
      reason: string;
    }) => {
      requireToken();
      return taskIpc.delayTask(taskId, newDate, reason);
    },
    onSuccess: (_, { taskId }) => invalidateTask(taskId),
    onError: (err: unknown) => {
      console.error('[useTaskMutations] delayTask failed:', err);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      taskId,
      message,
      messageType
    }: {
      taskId: string;
      message: string;
      messageType: string;
    }) => {
      requireToken();
      return taskIpc.sendTaskMessage(taskId, message, messageType);
    },
    onSuccess: (_, { taskId }) => invalidateTask(taskId),
    onError: (err: unknown) => {
      console.error('[useTaskMutations] sendMessage failed:', err);
    },
  });

  return {
    updateTask: updateTaskMutation,
    deleteTask: deleteTaskMutation,
    editTask: editTaskMutation,
    reportIssue: reportIssueMutation,
    delayTask: delayTaskMutation,
    sendMessage: sendMessageMutation,
  };
}
