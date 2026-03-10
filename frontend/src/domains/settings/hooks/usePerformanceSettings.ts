'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { settingsIpc } from '../ipc/settings.ipc';
import { ipcClient } from '@/lib/ipc';
import type { UserSession, UserPerformanceSettings } from '@/lib/backend';

// Performance settings form schema
const performanceSchema = z.object({
  cache_enabled: z.boolean(),
  cache_size: z.number().min(50).max(500),
  offline_mode: z.boolean(),
  sync_on_startup: z.boolean(),
  background_sync: z.boolean(),
  image_compression: z.boolean(),
  preload_data: z.boolean(),
});

export type PerformanceFormData = z.infer<typeof performanceSchema>;

export interface CacheStats {
  total_keys: number;
  used_memory_bytes: number;
  used_memory_mb: number | null;
  hit_rate?: number | null;
  miss_rate?: number | null;
  avg_response_time_ms?: number | null;
  cache_types: CacheTypeInfo[];
}

export interface CacheTypeInfo {
  cache_type: string;
  keys_count: number;
  memory_used_mb: number | null;
  hit_rate?: number | null;
}

export interface SyncStats {
  lastSync: string;
  pendingUploads: number;
  pendingDownloads: number;
  syncStatus: 'idle' | 'syncing' | 'error';
}

interface SyncStatusResponse {
  status?: string;
}

/**
 * Safely formats a number to a fixed number of decimal places.
 * Returns a zero-value string when `v` is null, undefined, or NaN.
 */
export const formatNumber = (v: number | null | undefined, digits = 2): string => {
  if (typeof v !== 'number' || Number.isNaN(v)) return (0).toFixed(digits);
  return v.toFixed(digits);
};

const DEFAULT_CACHE_STATS: CacheStats = {
  total_keys: 0,
  used_memory_bytes: 0,
  used_memory_mb: 0,
  cache_types: [],
};

const DEFAULT_SYNC_STATS: SyncStats = {
  lastSync: '',
  pendingUploads: 0,
  pendingDownloads: 0,
  syncStatus: 'idle',
};

export function usePerformanceSettings(user?: UserSession) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats>(DEFAULT_CACHE_STATS);
  const [syncStats, setSyncStats] = useState<SyncStats>(DEFAULT_SYNC_STATS);
  const [isOnline, setIsOnline] = useState(true);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.PERFORMANCE,
    component: 'PerformanceTab',
  });

  const form = useForm<PerformanceFormData>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      cache_enabled: true,
      cache_size: 100,
      offline_mode: false,
      sync_on_startup: true,
      background_sync: true,
      image_compression: true,
      preload_data: false,
    },
  });

  // Load performance settings and stats
  useEffect(() => {
    const loadPerformanceData = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        const [userSettings, cacheStatsResponse] = await Promise.all([
          settingsIpc.getUserSettings(),
          ipcClient.performance.getCacheStatistics().catch((error) => {
            logError('Failed to load cache statistics', { error: error instanceof Error ? error.message : error });
            return null;
          }),
        ]);

        if (userSettings?.performance) {
          form.reset(userSettings.performance as UserPerformanceSettings);
        }

        if (cacheStatsResponse) {
          setCacheStats(cacheStatsResponse as unknown as CacheStats);
        } else {
          setCacheStats(DEFAULT_CACHE_STATS);
        }

        setSyncStats({
          lastSync: new Date(Date.now() - 1800000).toISOString(),
          pendingUploads: 3,
          pendingDownloads: 0,
          syncStatus: 'idle',
        });

        setIsOnline(navigator.onLine);

        logInfo('Performance data loaded successfully');
      } catch (error) {
        logError('Failed to load performance data', { error: error instanceof Error ? error.message : error });
      } finally {
        setIsLoading(false);
      }
    };

    loadPerformanceData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [logInfo, logError, form, user?.token]);

  const onSubmit = useCallback(async (data: PerformanceFormData) => {
    if (!user?.token) {
      setSaveError('No authentication token available');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    logUserAction('Performance settings update initiated', {
      changedFields: Object.keys(form.formState.dirtyFields),
      userId: user.user_id
    });

    try {
      await settingsIpc.updateUserPerformance(data);

      setSaveSuccess(true);
      logInfo('Performance settings updated successfully', { userId: user.user_id });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error saving performance settings';
      setSaveError(errorMessage);
      logError('Performance settings update failed', { error: errorMessage, userId: user.user_id });
    } finally {
      setIsSaving(false);
    }
  }, [user?.token, user?.user_id, form.formState.dirtyFields, logUserAction, logInfo, logError]);

  const handleClearCache = useCallback(async () => {
    if (!user?.token) return;

    logUserAction('Cache clear initiated');

    try {
      await ipcClient.performance.clearApplicationCache({});

      const cacheStatsResponse = await ipcClient.performance.getCacheStatistics() as unknown as CacheStats;
      setCacheStats(cacheStatsResponse);

      logInfo('Cache cleared successfully');
    } catch (error) {
      logError('Cache clear failed', { error: error instanceof Error ? error.message : error });
    }
  }, [user?.token, logUserAction, logInfo, logError]);

  const handleForceSync = useCallback(async () => {
    if (!user?.token) return;

    logUserAction('Manual sync initiated');

    try {
      setSyncStats(prev => ({ ...prev, syncStatus: 'syncing' }));

      await ipcClient.sync.syncNow();

      const syncStatus = await ipcClient.sync.getStatus() as SyncStatusResponse;

      setSyncStats(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        pendingUploads: 0,
        pendingDownloads: 0,
        syncStatus: syncStatus?.status === 'running' ? 'syncing' : 'idle',
      }));

      logInfo('Manual sync completed successfully');
    } catch (error) {
      setSyncStats(prev => ({ ...prev, syncStatus: 'error' }));
      logError('Manual sync failed', { error: error instanceof Error ? error.message : error });
    }
  }, [user?.token, logUserAction, logInfo, logError]);

  return {
    isLoading,
    isSaving,
    saveSuccess,
    saveError,
    cacheStats,
    syncStats,
    isOnline,
    form,
    onSubmit,
    handleClearCache,
    handleForceSync,
  };
}
