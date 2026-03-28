import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskKeys } from "@/lib/query-keys";
import type { ChecklistItem } from "@/lib/backend";
import { taskIpc } from "../ipc/task.ipc";

/**
 * Loads and manages checklist items for a task via backend IPC.
 *
 * ADR-014 compliant: uses TanStack Query for server state instead of
 * manual useState + useEffect.  The toggle mutation uses optimistic
 * updates with automatic rollback on error.
 */
export function useTaskChecklist(taskId: string | undefined) {
  const queryClient = useQueryClient();

  const queryKey = [...taskKeys.byId(taskId ?? ""), "checklist"];

  const { data: items = [], isLoading } = useQuery<ChecklistItem[]>({
    queryKey,
    queryFn: () => taskIpc.checklistItemsGet(taskId!),
    enabled: !!taskId,
    staleTime: 30_000, // mutations call invalidateQueries onSettled; 30s prevents redundant background refetches
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      itemId,
      completed,
    }: {
      itemId: string;
      completed: boolean;
    }) => {
      return taskIpc.checklistItemUpdate(itemId, taskId!, {
        is_completed: completed,
      });
    },

    // Optimistic update — immediately flip the checkbox in the cache
    onMutate: async ({ itemId, completed }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<ChecklistItem[]>(queryKey);

      queryClient.setQueryData<ChecklistItem[]>(queryKey, (old) =>
        (old ?? []).map((item) =>
          item.id === itemId ? { ...item, is_completed: completed } : item,
        ),
      );

      return { previous };
    },

    // Replace the optimistically-updated item with the authoritative backend response
    onSuccess: (updated) => {
      queryClient.setQueryData<ChecklistItem[]>(queryKey, (old) =>
        (old ?? []).map((item) => (item.id === updated.id ? updated : item)),
      );
    },

    // Rollback on error
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("Erreur lors de la mise à jour de la checklist");
    },

    // Always reconcile with the server after settling
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleItem = useCallback(
    async (itemId: string, completed: boolean) => {
      if (!taskId) return;
      toggleMutation.mutate({ itemId, completed });
    },
    [taskId, toggleMutation],
  );

  return { items, isLoading, toggleItem };
}
