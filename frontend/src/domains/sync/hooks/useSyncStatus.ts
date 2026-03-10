import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { syncService } from '../services';
import type { SyncStatus } from '../services';

export type ExtendedSyncStatus = SyncStatus;

export function useSyncStatus(pollInterval = 5000) {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const { data: status, isLoading, error, refetch } = useQuery({
    queryKey: ['sync-status', lastUpdate],
    queryFn: async (): Promise<ExtendedSyncStatus> => {
      try {
        return await syncService.getStatus();
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
    staleTime: 2000,
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