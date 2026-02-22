import { useState, useEffect, useCallback } from 'react';
import { performanceIpc } from '../ipc';
import { useAuth } from '@/domains/auth';
import type { PerformanceMetrics } from '../api/types';

export interface UsePerformanceMetricsOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function usePerformanceMetrics(options: UsePerformanceMetricsOptions = {}) {
  const { limit = 100, autoRefresh = false, refreshInterval = 30000 } = options;
  const { user } = useAuth();

  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await performanceIpc.getMetrics(limit, user.token);
      setMetrics(result as unknown as PerformanceMetrics[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [limit, user?.token]);

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchMetrics, autoRefresh, refreshInterval]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  };
}
