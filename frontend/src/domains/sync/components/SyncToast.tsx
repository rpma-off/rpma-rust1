// src/domains/sync/components/SyncToast.tsx
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSyncStatus } from '..';

export function SyncToast() {
  const { status } = useSyncStatus(2000); // Poll more frequently for toasts
  const lastErrorMessageRef = useRef<string | null>(null);

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
      const firstError = errors[0] || 'Unknown sync error';
      if (lastErrorMessageRef.current !== firstError) {
        lastErrorMessageRef.current = firstError;
        toast.error(`Sync failed: ${firstError}`, {
          duration: 5000,
        });
      }
    }
  }, [status]);

  return null; // This component doesn't render anything
}
