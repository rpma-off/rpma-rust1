'use client';

import { useState, useEffect } from 'react';
import { ipcClient } from '@/shared/utils';
import { useAuth } from '@/shared/hooks/useAuth';

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  databaseSize: string;
  uptime: string;
  lastBackup: string;
}

export interface RecentActivity {
  id: string;
  type: 'user_login' | 'task_created' | 'task_completed' | 'system_error' | 'backup_completed' | 'intervention_started' | 'client_created';
  description: string;
  timestamp: string;
  user?: string;
  severity?: 'low' | 'medium' | 'high';
}

type DashboardStats = Awaited<ReturnType<typeof ipcClient.dashboard.getStats>>;

export interface UseAdminDashboardReturn {
  stats: SystemStats;
  recentActivities: RecentActivity[];
  dashboardStats: DashboardStats | null;
  loading: boolean;
}

const DEFAULT_STATS: SystemStats = {
  totalUsers: 0,
  activeUsers: 0,
  totalTasks: 0,
  completedTasks: 0,
  systemHealth: 'healthy',
  databaseSize: '0 MB',
  uptime: '0h 0m',
  lastBackup: 'Never',
};

/**
 * Loads admin dashboard stats, health checks, database info, and recent activities.
 * Centralizes all admin overview IPC calls behind a single hook.
 */
export function useAdminDashboard(): UseAdminDashboardReturn {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats>(DEFAULT_STATS);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.token) return;

      try {
        const rawStats = await ipcClient.dashboard.getStats();

        const [healthCheck, dbStats] = await Promise.all([
          ipcClient.admin.healthCheck().catch(() => 'unknown'),
          ipcClient.admin.getDatabaseStats().catch(() => ({ size_bytes: 0 })),
        ]);

        setDashboardStats(rawStats);

        setStats({
          totalUsers: rawStats.users?.total || 0,
          activeUsers: rawStats.users?.active || 0,
          totalTasks: rawStats.tasks?.total || 0,
          completedTasks: rawStats.tasks?.completed || 0,
          systemHealth: typeof healthCheck === 'string' && healthCheck === 'OK' ? 'healthy' : 'warning',
          databaseSize:
            typeof dbStats === 'object' && dbStats && 'size_bytes' in dbStats
              ? `${Math.round((dbStats as Record<string, unknown>).size_bytes as number / 1024 / 1024)} MB`
              : 'Unknown',
          uptime: 'Real-time',
          lastBackup: 'Auto-managed',
        });

        try {
          const activitiesData = await ipcClient.notifications.getRecentActivities();
          const mappedActivities: RecentActivity[] = (activitiesData as Record<string, unknown>[]).map((activity) => ({
            id: activity.id as string,
            type: activity.type as RecentActivity['type'],
            description: activity.description as string,
            timestamp: activity.timestamp as string,
            user: activity.user as string,
          }));
          setRecentActivities(mappedActivities);
        } catch (error) {
          console.error('Failed to load recent activities:', error);
          setRecentActivities([
            {
              id: '1',
              type: 'system_error',
              description: 'Erreur de chargement des activités récentes',
              timestamp: new Date().toISOString(),
              user: 'Système',
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      setLoading(true);
      loadStats();
    }
  }, [user?.token]);

  return { stats, recentActivities, dashboardStats, loading };
}
