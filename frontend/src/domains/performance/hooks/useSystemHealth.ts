import { useState, useEffect } from 'react';
import { useAuth } from '@/domains/auth';
import { performanceIpc } from '../ipc';
import type { SystemHealth, PerformanceStats } from '../api/types';

export interface UseSystemHealthOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useSystemHealth(options: UseSystemHealthOptions = {}) {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  const { user } = useAuth();

  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await performanceIpc.getStats(user.token);
      setStats(result as PerformanceStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance stats');
    }
  };

  const fetchSystemHealth = async () => {
    try {
      setError(null);
      const healthStatus = await performanceIpc.getStats(user?.token || '');
      setSystemHealth(healthStatus as unknown as SystemHealth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health');
    }
  };

  const fetchAll = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchStats(), fetchSystemHealth()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchAll, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, user?.token]);

  return {
    stats,
    systemHealth,
    loading,
    error,
    refetch: fetchAll,
    refetchStats: fetchStats,
    refetchHealth: fetchSystemHealth,
  };
}
