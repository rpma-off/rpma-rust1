import { useState, useEffect, useCallback } from 'react';
import { performanceIpc } from '../ipc';
import { useAuth } from '@/domains/auth';
import type { CacheStatistics, CacheSettings } from '../api/types';

export interface UseCacheStatisticsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useCacheStatistics(options: UseCacheStatisticsOptions = {}) {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  const { user } = useAuth();

  const [cacheStats, setCacheStats] = useState<CacheStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCacheStats = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await performanceIpc.getCacheStatistics(user.token);
      setCacheStats(result as unknown as CacheStatistics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cache statistics');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  const clearCache = async (types?: string[]) => {
    if (!user?.token) return;

    try {
      setLoading(true);
      setError(null);
      await performanceIpc.clearApplicationCache({ cache_types: types }, user.token);
      await fetchCacheStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (settings: Partial<CacheSettings>) => {
    if (!user?.token) return;

    try {
      setLoading(true);
      setError(null);
      await performanceIpc.configureCacheSettings(settings, user.token);
      await fetchCacheStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cache settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCacheStats();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchCacheStats, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchCacheStats, autoRefresh, refreshInterval]);

  return {
    cacheStats,
    loading,
    error,
    refetch: fetchCacheStats,
    clearCache,
    updateSettings,
  };
}
