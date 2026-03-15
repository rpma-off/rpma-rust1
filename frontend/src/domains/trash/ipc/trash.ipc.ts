import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { DeletedItem, EntityType } from '@/types/trash';

export const trashIpc = {
  list: async (entityType: EntityType, limit: number, offset: number): Promise<DeletedItem[]> => {
    return safeInvoke<DeletedItem[]>(IPC_COMMANDS.LIST_TRASH, {
      entityType,
      limit,
      offset,
    });
  },

  restore: async (entityType: EntityType, id: string): Promise<void> => {
    return safeInvoke<void>(IPC_COMMANDS.RESTORE_ENTITY, {
      entityType,
      id,
    });
  },

  hardDelete: async (entityType: EntityType, id: string): Promise<void> => {
    return safeInvoke<void>(IPC_COMMANDS.HARD_DELETE_ENTITY, {
      entityType,
      id,
    });
  },

  emptyTrash: async (entityType?: EntityType): Promise<number> => {
    return safeInvoke<number>(IPC_COMMANDS.EMPTY_TRASH, {
      entityType,
    });
  },
};
