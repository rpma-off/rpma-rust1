// src/components/sync/SyncIndicator.tsx
import React from 'react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { cn } from '@/lib/utils';
import { ipcClient } from '@/lib/ipc';
import { useTranslation } from '@/hooks/useTranslation';

export function SyncIndicator({ className }: { className?: string }) {
  const { status, isLoading } = useSyncStatus();
  const { t } = useTranslation();

  if (isLoading || !status) {
    return (
      <div className={cn("flex items-center gap-2 text-gray-500", className)}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-sm">{t('sync.loading')}</span>
      </div>
    );
  }

  const { isOnline, pendingOperations, errors } = status;

  if (!isOnline) {
    return (
      <div className={cn("flex items-center gap-2 text-orange-600", className)}>
        <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
          <span className="text-white text-xs">⚠</span>
        </div>
        <span className="text-sm font-medium">{t('sync.offline')}</span>
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className={cn("flex items-center gap-2 text-red-600", className)}>
        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
          <span className="text-white text-xs">✗</span>
        </div>
        <span className="text-sm font-medium">{t('sync.error')}</span>
        <button
          onClick={async () => {
            try {
              await ipcClient.sync.syncNow();
            } catch (err) {
              console.error('Retry sync failed:', err);
            }
          }}
          className="text-xs underline hover:no-underline"
        >
          {t('sync.retry')}
        </button>
      </div>
    );
  }

  if (pendingOperations > 0) {
    return (
      <div className={cn("flex items-center gap-2 text-blue-600", className)}>
        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm font-medium">
          {t('sync.syncing', { count: pendingOperations })}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-green-600", className)}>
      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
        <span className="text-white text-xs">✓</span>
      </div>
      <span className="text-sm font-medium">{t('sync.synced')}</span>
    </div>
  );
}