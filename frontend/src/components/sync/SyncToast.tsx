// src/components/sync/SyncToast.tsx
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export function SyncToast() {
  const { status } = useSyncStatus(2000); // Poll more frequently for toasts

  useEffect(() => {
    if (!status) return;

    const { isOnline, pendingOperations, errors } = status;

    // Show offline toast
    if (!isOnline && pendingOperations > 0) {
      toast('You are offline. Changes will be synced when connection is restored.', {
        icon: '⚠️',
        duration: 4000,
      });
    }

    // Show sync complete toast
    if (isOnline && pendingOperations === 0 && status.lastSync) {
      const timeSinceLastSync = Date.now() - status.lastSync.getTime();
      if (timeSinceLastSync < 5000) { // Only show if sync just completed
        toast.success('All changes synced successfully!', {
          duration: 3000,
        });
      }
    }

    // Show error toast
    if (errors.length > 0) {
      toast.error(`Sync failed: ${errors[0]}`, {
        duration: 5000,
      });
    }
  }, [status]);

  return null; // This component doesn't render anything
}