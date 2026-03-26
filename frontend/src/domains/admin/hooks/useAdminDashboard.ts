"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/useAuth";
import { dashboardIpc } from "@/domains/dashboard/ipc";
import type { DashboardStats } from "@/domains/dashboard/api/types";
import { adminIpc } from "@/domains/admin/ipc/admin.ipc";
import { notificationsIpc } from "@/domains/notifications/ipc/notifications.ipc";
import { adminKeys, dashboardKeys } from "@/lib/query-keys";

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  systemHealth: "healthy" | "warning" | "critical";
  databaseSize: string;
  uptime: string;
  lastBackup: string;
}

export interface RecentActivity {
  id: string;
  type:
    | "user_login"
    | "task_created"
    | "task_completed"
    | "system_error"
    | "backup_completed"
    | "intervention_started"
    | "client_created";
  description: string;
  timestamp: string;
  user?: string;
  severity?: "low" | "medium" | "high";
}

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
  systemHealth: "healthy",
  databaseSize: "0 MB",
  uptime: "0h 0m",
  lastBackup: "Never",
};

/**
 * Loads admin dashboard stats, health checks, database info, and recent activities.
 * Uses parallel queries via useQueries for efficiency.
 */
export function useAdminDashboard(): UseAdminDashboardReturn {
  const { user } = useAuth();
  const enabled = !!user?.token;

  const [statsQuery, healthQuery, dbStatsQuery, activitiesQuery] = useQueries({
    queries: [
      {
        queryKey: dashboardKeys.stats(),
        queryFn: () => dashboardIpc.getStats(),
        enabled,
        staleTime: 60_000,
      },
      {
        queryKey: adminKeys.dashboard(),
        queryFn: () => adminIpc.healthCheck().catch(() => "unknown"),
        enabled,
        staleTime: 30_000,
        retry: false,
      },
      {
        queryKey: [...adminKeys.all, "db-stats"],
        queryFn: () =>
          adminIpc.getDatabaseStats().catch(() => ({ size_bytes: 0 })),
        enabled,
        staleTime: 60_000,
      },
      {
        queryKey: [...adminKeys.all, "recent-activities"],
        queryFn: () => notificationsIpc.getRecentActivities().catch(() => []),
        enabled,
        staleTime: 30_000,
      },
    ],
  });

  const loading =
    statsQuery.isLoading || healthQuery.isLoading || dbStatsQuery.isLoading;

  const stats: SystemStats = useMemo(() => {
    const rawStats = statsQuery.data;
    const healthCheck = healthQuery.data;
    const dbStats = dbStatsQuery.data;

    if (!rawStats) return DEFAULT_STATS;

    return {
      totalUsers: rawStats.users?.total || 0,
      activeUsers: rawStats.users?.active || 0,
      totalTasks: rawStats.tasks?.total || 0,
      completedTasks: rawStats.tasks?.completed || 0,
      systemHealth:
        typeof healthCheck === "string" && healthCheck === "OK"
          ? "healthy"
          : "warning",
      databaseSize:
        typeof dbStats === "object" && dbStats && "size_bytes" in dbStats
          ? `${Math.round(((dbStats as Record<string, unknown>).size_bytes as number) / 1024 / 1024)} MB`
          : "Unknown",
      uptime: "Real-time",
      lastBackup: "Auto-managed",
    };
  }, [statsQuery.data, healthQuery.data, dbStatsQuery.data]);

  const recentActivities: RecentActivity[] = useMemo(() => {
    const raw = activitiesQuery.data as Record<string, unknown>[] | undefined;
    if (!Array.isArray(raw)) return [];
    return raw.map((activity) => ({
      id: activity.id as string,
      type: activity.type as RecentActivity["type"],
      description: activity.description as string,
      timestamp: activity.timestamp as string,
      user: activity.user as string,
    }));
  }, [activitiesQuery.data]);

  return {
    stats,
    recentActivities,
    dashboardStats: (statsQuery.data as DashboardStats) ?? null,
    loading,
  };
}
