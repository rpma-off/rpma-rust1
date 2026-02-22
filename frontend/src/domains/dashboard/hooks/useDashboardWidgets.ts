import { useState, useCallback } from 'react';
import type { DashboardWidget, DashboardFilter } from '../api/types';

export function useDashboardWidgets() {
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

  const reorderWidgets = useCallback((newOrder: DashboardWidget[]) => {
    setWidgets(newOrder);
  }, []);

  return {
    widgets,
    addWidget,
    removeWidget,
    updateWidget,
    reorderWidgets,
  };
}

export function useDashboardFilters(initialFilters?: Partial<DashboardFilter>) {
  const [filters, setFilters] = useState<DashboardFilter>({
    timeRange: initialFilters?.timeRange || 'today',
    status: initialFilters?.status,
    priority: initialFilters?.priority,
    assignedTo: initialFilters?.assignedTo,
    team: initialFilters?.team,
  });

  const updateFilters = useCallback((newFilters: Partial<DashboardFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      timeRange: 'today',
      status: undefined,
      priority: undefined,
      assignedTo: undefined,
      team: undefined,
    });
  }, []);

  return {
    filters,
    updateFilters,
    resetFilters,
  };
}
