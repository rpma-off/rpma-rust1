import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/lib/query-keys";
import type { UpdateTaskRequest } from "@/lib/backend";
import { logger } from "@/lib/logging";
import { LogDomain } from "@/lib/logging/types";
import { useAuth } from "@/shared/hooks/useAuth";
import type { JsonObject } from "@/types/json";
import { taskIpc } from "../ipc/task.ipc";

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

  /** Throws if there is no active authenticated session. */
  function requireToken(): void {
    if (!user?.token) throw new Error("Authentication required");
  }

  const invalidateTask = (taskId: string) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.byId(taskId) });
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  };

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskRequest;
    }) => {
      requireToken();
      return taskIpc.update(taskId, data);
    },
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.byId(taskId) });
      const previous = queryClient.getQueryData(taskKeys.byId(taskId));
      if (previous && typeof previous === "object") {
        const patch: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            patch[key] = value;
          }
        }
        queryClient.setQueryData(taskKeys.byId(taskId), {
          ...(previous as Record<string, unknown>),
          ...patch,
        });
      }
      return { previous, taskId };
    },
    onError: (err: unknown, { taskId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(taskKeys.byId(taskId), context.previous);
      }
      logger.error(
        LogDomain.TASK,
        "updateTask failed",
        err instanceof Error ? err : new Error(String(err)),
        { task_id: taskId },
      );
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
    onError: (err: unknown, taskId: string) => {
      logger.error(
        LogDomain.TASK,
        "deleteTask failed",
        err instanceof Error ? err : new Error(String(err)),
        { task_id: taskId },
      );
    },
  });

  const editTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: JsonObject;
    }) => {
      requireToken();
      return taskIpc.editTask(taskId, data);
    },
    onSuccess: (_, { taskId }) => invalidateTask(taskId),
    onError: (
      err: unknown,
      { taskId }: { taskId: string; data: JsonObject },
    ) => {
      logger.error(
        LogDomain.TASK,
        "editTask failed",
        err instanceof Error ? err : new Error(String(err)),
        { task_id: taskId },
      );
    },
  });

  const reportIssueMutation = useMutation({
    mutationFn: async ({
      taskId,
      issueType,
      severity,
      description,
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
    onError: (
      err: unknown,
      {
        taskId,
      }: {
        taskId: string;
        issueType: string;
        severity: string;
        description: string;
      },
    ) => {
      logger.error(
        LogDomain.TASK,
        "reportIssue failed",
        err instanceof Error ? err : new Error(String(err)),
        { task_id: taskId },
      );
    },
  });

  const delayTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      newDate,
      reason,
    }: {
      taskId: string;
      newDate: string;
      reason: string;
    }) => {
      requireToken();
      return taskIpc.delayTask(taskId, newDate, reason);
    },
    onSuccess: (_, { taskId }) => invalidateTask(taskId),
    onError: (
      err: unknown,
      { taskId }: { taskId: string; newDate: string; reason: string },
    ) => {
      logger.error(
        LogDomain.TASK,
        "delayTask failed",
        err instanceof Error ? err : new Error(String(err)),
        { task_id: taskId },
      );
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      taskId,
      message,
      messageType,
    }: {
      taskId: string;
      message: string;
      messageType: string;
    }) => {
      requireToken();
      return taskIpc.sendTaskMessage(taskId, message, messageType);
    },
    onSuccess: (_, { taskId }) => invalidateTask(taskId),
    onError: (
      err: unknown,
      { taskId }: { taskId: string; message: string; messageType: string },
    ) => {
      logger.error(
        LogDomain.TASK,
        "sendMessage failed",
        err instanceof Error ? err : new Error(String(err)),
        { task_id: taskId },
      );
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
