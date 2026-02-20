import { useState, useEffect, useCallback } from 'react';
import { offlineQueueService } from '@/lib/offline/queue';
import { OfflineAction } from '@/lib/offline/types';

type OfflineSyncStatus = {
  isOnline: boolean;
  pendingActions: number;
  failedActions: number;
  lastSync: Date | null;
  sync: () => Promise<void>;
  addAction: (type: OfflineAction['type'], payload: Record<string, unknown>) => Promise<string>;
};

export function useOfflineSync(): OfflineSyncStatus {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueStatus, setQueueStatus] = useState({
    pending: 0,
    failed: 0,
    lastSync: null as number | null,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Update queue status
  const updateQueueStatus = useCallback(() => {
    const status = offlineQueueService.getStatus();
    setQueueStatus({
      pending: status.pending,
      failed: status.failed,
      lastSync: status.lastSync,
    });
    return status;
  }, []);

  // Sync function to process the queue
  const sync = useCallback(async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      // Process the queue
      await offlineQueueService['processQueue']();
      // Update the status after processing
      updateQueueStatus();
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateQueueStatus]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process queue when coming back online
      sync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Set initial state
    setIsOnline(navigator.onLine);
    updateQueueStatus();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for network status periodically
    const interval = setInterval(updateQueueStatus, 30000);

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [updateQueueStatus, sync]);

  // Add an action to the queue
  const addAction = useCallback(async (type: OfflineAction['type'], payload: Record<string, unknown>): Promise<string> => {
    const actionId = await offlineQueueService.addAction(type, payload);
    updateQueueStatus();
    
    // If online, trigger sync
    if (isOnline) {
      sync();
    }
    
    return actionId;
  }, [isOnline, sync, updateQueueStatus]);

  return {
    isOnline,
    pendingActions: queueStatus.pending,
    failedActions: queueStatus.failed,
    lastSync: queueStatus.lastSync ? new Date(queueStatus.lastSync) : null,
    sync,
    addAction,
  };
}

export default useOfflineSync;
