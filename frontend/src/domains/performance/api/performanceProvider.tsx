'use client';

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react';
import type { PerformanceContextValue } from './types';

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

interface PerformanceProviderProps {
  children: ReactNode;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PerformanceProvider({ children, autoRefresh: _autoRefresh = false, refreshInterval: _refreshInterval = 30000 }: PerformanceProviderProps) {
  const [metrics, setMetrics] = useState<PerformanceContextValue['metrics']>([]);
  const [stats, _setStats] = useState<PerformanceContextValue['stats']>(null);
  const [cacheStats, _setCacheStats] = useState<PerformanceContextValue['cacheStats']>(null);
  const [systemHealth, _setSystemHealth] = useState<PerformanceContextValue['systemHealth']>(null);
  const [loading, _setLoading] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  // Performance monitoring removed — stubs return empty data
  const refreshMetrics = useCallback(async () => { setMetrics([]); }, []);
  const refreshStats = useCallback(async () => {}, []);
  const refreshCacheStats = useCallback(async () => {}, []);
  const refreshSystemHealth = useCallback(async () => {}, []);
  const clearCache = useCallback(async (_types?: string[]) => {}, []);
  const updateCacheSettings = useCallback(async (_settings: Parameters<PerformanceContextValue['updateCacheSettings']>[0]) => {}, []);

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
