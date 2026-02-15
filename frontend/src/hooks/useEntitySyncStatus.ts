import { useQuery } from '@tanstack/react-query';
import { useSyncStatus } from './useSyncStatus';
import { SyncOperation, EntityType } from '@/lib/backend';
import { ipcClient } from '@/lib/ipc';

export interface EntitySyncStatus {
  entityId: string;
  entityType: EntityType;
  status: 'synced' | 'pending' | 'syncing' | 'error';
  lastModified: Date;
  error?: string;
}

export function useEntitySyncStatus(entityId: string, entityType: EntityType) {
  const { status: globalStatus } = useSyncStatus();

  // Check if this specific entity has pending operations
  const { data: entityStatus } = useQuery({
    queryKey: ['entity-sync-status', entityId, entityType],
    queryFn: async (): Promise<EntitySyncStatus | null> => {
      try {
        // Query queue for operations on this entity
        const operations = await ipcClient.sync.getOperationsForEntity(entityId, entityType) as SyncOperation[];

        if (operations.length === 0) {
          return null; // No pending operations
        }

        const hasErrors = operations.some((op: SyncOperation) => op.status === 'failed');
        const isProcessing = operations.some((op: SyncOperation) => op.status === 'processing');

        return {
          entityId,
          entityType,
          status: hasErrors ? 'error' : isProcessing ? 'syncing' : 'pending',
          lastModified: new Date(operations[0].created_at),
          error: hasErrors ? operations.find((op: SyncOperation) => op.last_error)?.last_error || undefined : undefined,
        };
      } catch (error) {
        console.error('Failed to get entity sync status:', error);
        return null;
      }
    },
    enabled: !!globalStatus?.pendingOperations,
  });

  return entityStatus;
}