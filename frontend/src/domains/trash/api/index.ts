import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trashIpc } from '../ipc';
import type { EntityType } from '@/types/trash';

export const trashKeys = {
  all: ['trash'] as const,
  list: (type: EntityType) => [...trashKeys.all, type] as const,
};

export function useTrashList(entityType: EntityType, limit: number = 100, offset: number = 0) {
  return useQuery({
    queryKey: trashKeys.list(entityType),
    queryFn: () => trashIpc.list(entityType, limit, offset),
  });
}

export function useRestoreEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, id }: { entityType: EntityType; id: string }) =>
      trashIpc.restore(entityType, id),
    onSuccess: (_, { entityType }) => {
      queryClient.invalidateQueries({ queryKey: trashKeys.list(entityType) });
      // We also aggressively invalidate the specific entity query keys to refresh the UI
      queryClient.invalidateQueries({ queryKey: [entityType.toLowerCase()] });
    },
  });
}

export function useHardDeleteEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, id }: { entityType: EntityType; id: string }) =>
      trashIpc.hardDelete(entityType, id),
    onSuccess: (_, { entityType }) => {
      queryClient.invalidateQueries({ queryKey: trashKeys.list(entityType) });
    },
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityType?: EntityType) => trashIpc.emptyTrash(entityType),
    onSuccess: (_, entityType) => {
      if (entityType) {
        queryClient.invalidateQueries({ queryKey: trashKeys.list(entityType) });
      } else {
        queryClient.invalidateQueries({ queryKey: trashKeys.all });
      }
    },
  });
}
