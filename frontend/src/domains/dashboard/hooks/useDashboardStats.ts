import { useState, useEffect, useCallback } from 'react';
import { dashboardIpc } from '../ipc';
import type { DashboardStats } from '../api/types';

export interface UseDashboardStatsOptions {
  timeRange?: 'day' | 'week' | 'month' | 'year';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useDashboardStats(options: UseDashboardStatsOptions = {}) {
  const { timeRange = 'day', autoRefresh = false, refreshInterval = 60000 } = options;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardIpc.getStats(timeRange);
      
      setStats({
        tasks: {
          total: result.tasks?.total || 0,
          completed: result.tasks?.completed || 0,
          pending: result.tasks?.pending || 0,
          active: result.tasks?.active || 0,
          overdue: 0,
        },
        clients: {
          total: result.clients?.total || 0,
          active: result.clients?.active || 0,
          new_this_month: 0,
        },
        users: {
          total: result.users?.total || 0,
          active: result.users?.active || 0,
          admins: result.users?.admins || 0,
          technicians: result.users?.technicians || 0,
        },
        sync: {
          status: result.sync?.status as 'idle' | 'syncing' | 'error' || 'idle',
          pending_operations: result.sync?.pending_operations || 0,
          completed_operations: result.sync?.completed_operations || 0,
          last_sync: new Date().toISOString(),
        },
        interventions: {
          total: 0,
          in_progress: 0,
          completed_today: 0,
          upcoming: 0,
        },
        inventory: {
          total_materials: 0,
          low_stock: 0,
          out_of_stock: 0,
        },
        last_updated: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchStats();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchStats, autoRefresh, refreshInterval]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
