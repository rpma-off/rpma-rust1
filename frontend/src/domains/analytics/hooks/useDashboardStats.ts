'use client';

import { useState, useEffect } from 'react';

import { ipcClient } from '@/lib/ipc/client';
import { useAuth } from '@/domains/auth/api';
import { DashboardStats } from '@/domains/analytics/components/dashboard/types';

export function useDashboardStats(timeRange?: 'day' | 'week' | 'month' | 'year') {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    averageCompletionTime: 0,
    efficiencyRate: 0,
    productivityTrend: 0,
    topTechnician: '',
    completionRate: 0,
    avgTasksPerTechnician: 0,
    mostActiveZone: '',
    byTechnician: [],
    byDate: [],
    byPPFZone: [],
    byVehicleModel: [],
    trendData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        if (!user?.token) {
          throw new Error('Authentication required');
        }

        // Use actual dashboard stats fetching with time range
        const dashboardStats = await ipcClient.dashboard.getStats(user.token, timeRange);

        // Transform from backend format to complex frontend format
        const totalTasks = dashboardStats.tasks?.total || 0;
        const completedTasks = dashboardStats.tasks?.completed || 0;
        const pendingTasks = dashboardStats.tasks?.pending || 0;
        const inProgressTasks = dashboardStats.tasks?.active || 0;

        setStats({
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          pending: pendingTasks,
          averageCompletionTime: 0, // Not available from backend
          efficiencyRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
          productivityTrend: 0, // Not available from backend
          topTechnician: '', // Not available from backend
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
          avgTasksPerTechnician: 0, // Not available from backend
          mostActiveZone: '', // Not available from backend
          byTechnician: [], // Not available from backend
          byDate: [], // Not available from backend
          byPPFZone: [], // Not available from backend
          byVehicleModel: [], // Not available from backend
          trendData: [], // Not available from backend
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange, user?.token]);

  return { stats, loading, error };
}
