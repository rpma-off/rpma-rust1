"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard.service";
import { dashboardKeys } from "@/lib/query-keys";
import type {
  DashboardContextValue,
  DashboardFilter,
  DashboardWidget,
  RecentActivity,
} from "./types";

const DashboardContext = createContext<DashboardContextValue | null>(null);

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: "tasks-overview",
    type: "kpi",
    title: "Vue d'ensemble des tâches",
    position: { x: 0, y: 0, w: 2, h: 1 },
    config: {},
  },
  {
    id: "recent-activity",
    type: "activity",
    title: "Activité récente",
    position: { x: 2, y: 0, w: 2, h: 2 },
    config: { limit: 10 },
  },
];

interface DashboardProviderProps {
  children: ReactNode;
  initialFilters?: Partial<DashboardFilter>;
}

export function DashboardProvider({
  children,
  initialFilters,
}: DashboardProviderProps) {
  const queryClient = useQueryClient();

  // ── UI-only / ephemeral state — stays in useState ──────────────────────────
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [filters, setFilters] = useState<DashboardFilter>({
    timeRange: initialFilters?.timeRange ?? "today",
    status: initialFilters?.status,
    priority: initialFilters?.priority,
    assignedTo: initialFilters?.assignedTo,
    team: initialFilters?.team,
  });

  // ── Server state — managed by TanStack Query ───────────────────────────────
  const mappedTimeRange =
    filters.timeRange === "today"
      ? "day"
      : filters.timeRange === "quarter" || filters.timeRange === "all"
        ? "month"
        : filters.timeRange;

  const statsQuery = useQuery({
    queryKey: dashboardKeys.stats(mappedTimeRange),
    queryFn: () => dashboardService.getStats(mappedTimeRange),
    staleTime: 60_000,
  });

  const activityQuery = useQuery({
    queryKey: dashboardKeys.recentActivity(10),
    queryFn: (): Promise<RecentActivity[]> =>
      dashboardService.getRecentActivity(10),
    staleTime: 60_000,
  });

  // ── Refresh: invalidate both server queries ────────────────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.stats(mappedTimeRange),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.recentActivity(10),
      }),
    ]);
  }, [queryClient, mappedTimeRange]);

  // ── Widget management (pure UI state) ─────────────────────────────────────
  const updateFilters = useCallback((newFilters: Partial<DashboardFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const addWidget = useCallback((widget: Omit<DashboardWidget, "id">) => {
    setWidgets((prev) => [...prev, { ...widget, id: `widget-${Date.now()}` }]);
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  }, []);

  const updateWidget = useCallback(
    (widgetId: string, updates: Partial<DashboardWidget>) => {
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
      );
    },
    [],
  );

  // ── Derived loading / error from queries ───────────────────────────────────
  const loading = statsQuery.isLoading || activityQuery.isLoading;
  const error =
    statsQuery.error instanceof Error
      ? statsQuery.error.message
      : activityQuery.error instanceof Error
        ? activityQuery.error.message
        : null;

  const value = useMemo<DashboardContextValue>(
    () => ({
      stats: statsQuery.data ?? null,
      recentActivity: activityQuery.data ?? [],
      widgets,
      filters,
      loading,
      error,
      refresh,
      updateFilters,
      addWidget,
      removeWidget,
      updateWidget,
    }),
    [
      statsQuery.data,
      activityQuery.data,
      widgets,
      filters,
      loading,
      error,
      refresh,
      updateFilters,
      addWidget,
      removeWidget,
      updateWidget,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}
