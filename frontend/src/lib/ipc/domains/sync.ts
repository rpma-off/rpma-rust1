import { safeInvoke, cachedInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { JsonValue } from '@/types/json';

/**
 * Data synchronization operations
 */
export const syncOperations = {
  /**
   * Starts the background synchronization service
   * @returns Promise resolving when service is started
   */
  startBackgroundService: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SYNC_START_BACKGROUND_SERVICE),

  /**
   * Stops the background synchronization service
   * @returns Promise resolving when service is stopped
   */
  stopBackgroundService: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SYNC_STOP_BACKGROUND_SERVICE),

  /**
   * Gets the current synchronization status
   * @returns Promise resolving to sync status
   */
  getStatus: (): Promise<JsonValue> =>
    cachedInvoke('sync:status', IPC_COMMANDS.SYNC_GET_STATUS, undefined, undefined, 5000),

  /**
   * Triggers an immediate synchronization
   * @returns Promise resolving to sync result
   */
  syncNow: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.SYNC_NOW),

  /**
   * Gets synchronization operations for a specific entity
   * @param entityId - Entity ID
   * @param entityType - Entity type
   * @returns Promise resolving to sync operations for the entity
   */
  getOperationsForEntity: (entityId: string, entityType: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.SYNC_GET_OPERATIONS_FOR_ENTITY, {
      entity_id: entityId,
      entity_type: entityType
    }),
};
