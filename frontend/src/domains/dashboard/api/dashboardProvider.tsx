'use client';

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type { DashboardContextValue, DashboardFilter, DashboardWidget } from './types';

const DashboardContext = createContext<DashboardContextValue | null>(null);

interface DashboardProviderProps {
  children: ReactNode;
  initialFilters?: Partial<DashboardFilter>;
}

export function DashboardProvider({ children, initialFilters }: DashboardProviderProps) {
  const [stats, setStats] = useState<DashboardContextValue['stats']>(null);
  const [recentActivity, setRecentActivity] = useState<DashboardContextValue['recentActivity']>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'tasks-overview',
      type: 'kpi',
      title: 'Vue d\'ensemble des tâches',
      position: { x: 0, y: 0, w: 2, h: 1 },
      config: {},
    },
    {
      id: 'recent-activity',
      type: 'activity',
      title: 'Activité récente',
      position: { x: 2, y: 0, w: 2, h: 2 },
      config: { limit: 10 },
    },
  ]);
  const [filters, setFilters] = useState<DashboardFilter>({
    timeRange: initialFilters?.timeRange || 'today',
    status: initialFilters?.status,
    priority: initialFilters?.priority,
    assignedTo: initialFilters?.assignedTo,
    team: initialFilters?.team,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getStats(filters.timeRange);
      setStats(data);
      const activity = await dashboardService.getRecentActivity(10);
      setRecentActivity(activity as RecentActivity[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filters.timeRange]);

  const updateFilters = useCallback((newFilters: Partial<DashboardFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const addWidget = useCallback((widget: Omit<DashboardWidget, 'id'>) => {
    setWidgets(prev => [
      ...prev,
      {
        ...widget,
        id: `widget-${Date.now()}`,
      },
    ]);
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  }, []);

  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setWidgets(prev =>
      prev.map(w => (w.id === widgetId ? { ...w, ...updates } : w))
    );
  }, []);

  const value = useMemo<DashboardContextValue>(
    () => ({
      stats,
      recentActivity,
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
    [stats, recentActivity, widgets, filters, loading, error, refresh, updateFilters, addWidget, removeWidget, updateWidget]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}
