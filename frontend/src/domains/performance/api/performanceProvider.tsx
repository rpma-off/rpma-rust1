'use client';

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react';
import { performanceService } from '../services/performance.service';
import type { PerformanceContextValue } from './types';

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

interface PerformanceProviderProps {
  children: ReactNode;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PerformanceProvider({ children, autoRefresh: _autoRefresh = false, refreshInterval: _refreshInterval = 30000 }: PerformanceProviderProps) {
  const [metrics, setMetrics] = useState<PerformanceContextValue['metrics']>([]);
  const [stats, setStats] = useState<PerformanceContextValue['stats']>(null);
  const [cacheStats, setCacheStats] = useState<PerformanceContextValue['cacheStats']>(null);
  const [systemHealth, setSystemHealth] = useState<PerformanceContextValue['systemHealth']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await performanceService.getMetrics(100);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setError(null);
      const data = await performanceService.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  }, []);

  const refreshCacheStats = useCallback(async () => {
    try {
      setError(null);
      const data = await performanceService.getCacheStatistics();
      setCacheStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cache stats');
    }
  }, []);

  const refreshSystemHealth = useCallback(async () => {
    try {
      setError(null);
      const data = await performanceService.getSystemHealth();
      setSystemHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health');
    }
  }, []);

  const clearCache = useCallback(async (types?: string[]) => {
    try {
      setError(null);
      await performanceService.clearCache(types);
      await refreshCacheStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  }, [refreshCacheStats]);

  const updateCacheSettings = useCallback(async (settings: Parameters<PerformanceContextValue['updateCacheSettings']>[0]) => {
    try {
      setError(null);
      await performanceService.configureCacheSettings(settings);
      await refreshCacheStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cache settings');
    }
  }, [refreshCacheStats]);

  const value = useMemo<PerformanceContextValue>(
    () => ({
      metrics,
      stats,
      cacheStats,
      systemHealth,
      loading,
      error,
      refreshMetrics,
      refreshStats,
      refreshCacheStats,
      refreshSystemHealth,
      clearCache,
      updateCacheSettings,
    }),
    [metrics, stats, cacheStats, systemHealth, loading, error, refreshMetrics, refreshStats, refreshCacheStats, refreshSystemHealth, clearCache, updateCacheSettings]
  );

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

export function usePerformance(): PerformanceContextValue {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within PerformanceProvider');
  }
  return context;
}
