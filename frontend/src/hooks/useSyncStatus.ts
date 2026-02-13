import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ipcClient } from '@/lib/ipc';


interface BackendSyncStatus {
  network_available: boolean;
  is_running: boolean;
  is_syncing: boolean;
  pending_operations: number;
  failed_operations: number;
  total_operations: number;
  last_sync_at?: number;
  last_sync?: number;
  errors?: string[];
}

export interface ExtendedSyncStatus {
  is_online: boolean;
  isOnline: boolean;
  isRunning: boolean;
  last_sync_at?: number;
  lastSync?: Date;
  pending_operations: number;
  pendingOperations: number;
  failed_operations: number;
  total_operations: number;
  is_syncing: boolean;
  isSyncing: boolean;
  error?: string;
  errors: string[];
  metrics: {
    totalSyncOperations: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncDuration: number;
  };
}

export function useSyncStatus(pollInterval = 5000) {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const { data: status, isLoading, error, refetch } = useQuery({
    queryKey: ['sync-status', lastUpdate],
    queryFn: async (): Promise<ExtendedSyncStatus> => {
      try {
        const result = await ipcClient.sync.getStatus() as unknown as BackendSyncStatus;
        return {
          is_online: result.network_available ?? false,
          isOnline: result.network_available ?? false,
          isRunning: result.is_running ?? false,
          is_syncing: result.is_syncing ?? false,
          isSyncing: result.is_syncing ?? false,
          pending_operations: result.pending_operations ?? 0,
          pendingOperations: result.pending_operations ?? 0,
          failed_operations: result.failed_operations ?? 0,
          total_operations: result.total_operations ?? 0,
          last_sync_at: result.last_sync_at,
          lastSync: result.last_sync ? new Date(result.last_sync) : undefined,
          errors: result.errors || [],
          metrics: {
            totalSyncOperations: 0, // TODO: Add to backend
            successfulSyncs: 0,
            failedSyncs: 0,
            averageSyncDuration: 0,
          },
        };
      } catch (err) {
        console.error('Failed to get sync status:', err);
        return {
          is_online: false,
          isOnline: false,
          isRunning: false,
          is_syncing: false,
          isSyncing: false,
          pending_operations: 0,
          pendingOperations: 0,
          failed_operations: 0,
          total_operations: 0,
          errors: ['Failed to connect to backend'],
          metrics: {
            totalSyncOperations: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            averageSyncDuration: 0,
          },
        };
      }
    },
    refetchInterval: pollInterval,
    staleTime: 1000,
  });

  // Force refresh when operations are performed
  useEffect(() => {
    const handleOperationPerformed = () => {
      setLastUpdate(Date.now());
      refetch();
    };

    // Listen for custom events from Tauri commands
    window.addEventListener('sync-operation-performed', handleOperationPerformed);

    return () => {
      window.removeEventListener('sync-operation-performed', handleOperationPerformed);
    };
  }, [refetch]);

  return {
    status,
    isLoading,
    error,
    refetch: () => setLastUpdate(Date.now()),
  };
}