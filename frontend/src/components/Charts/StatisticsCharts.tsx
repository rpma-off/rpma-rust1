'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStats } from '@/components/dashboard/types';
import { useTranslation } from '@/hooks/useTranslation';

interface StatisticsChartsProps {
  stats: DashboardStats;
  timeRange?: 'day' | 'week' | 'month' | 'year';
  onTimeRangeChange?: (range: 'day' | 'week' | 'month' | 'year') => void;
  onRefresh?: () => void;
  onExport?: (format: 'pdf' | 'csv') => void;
  onFiltersChange?: (filters: {
    technician?: string;
    ppfZone?: string;
    vehicleModel?: string;
  }) => void;
  autoRefresh?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  refreshInterval?: number;
  onRefreshIntervalChange?: (interval: number) => void;
}

export const StatisticsCharts: React.FC<StatisticsChartsProps> = ({
  stats
}) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.statistics')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          {t('dashboard.toBeImplemented')}
          <div className="mt-4 space-y-2">
            <p>{t('dashboard.totalTasks', { total: stats.total })}</p>
            <p>{t('dashboard.completed', { count: stats.completed })}</p>
            <p>{t('dashboard.inProgress', { count: stats.inProgress })}</p>
            <p>{t('dashboard.pending', { count: stats.pending })}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};