import { safeInvoke, cachedInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export const syncIpc = {
  start: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SYNC_START_BACKGROUND_SERVICE),

  stop: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SYNC_STOP_BACKGROUND_SERVICE),

  getStatus: (): Promise<JsonValue> =>
    cachedInvoke('sync:status', IPC_COMMANDS.SYNC_GET_STATUS, undefined, undefined, 5000),

  syncNow: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SYNC_NOW),

  getOperationsForEntity: (entityId: string, entityType: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.SYNC_GET_OPERATIONS_FOR_ENTITY, {
      entity_id: entityId,
      entity_type: entityType
    }),
};
