'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { ComponentType } from 'react';
import type { DashboardStats } from '../api/types';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatsCard({ title, value, icon: Icon, description, trend, trendValue, color = 'default' }: StatsCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-green-500/10 text-green-500';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'danger':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-[hsl(var(--rpma-primary-light))] text-[hsl(var(--rpma-primary))]';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '';
    }
  };

  return (
    <Card className="rpma-shell">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trendValue && (
              <p className={`text-xs ${getTrendColor()}`}>
                {getTrendIcon()} {trendValue}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${getColorClasses()}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardStatsGridProps {
  stats: DashboardStats | null;
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Tâches totales"
        value={stats.tasks.total}
        description={`${stats.tasks.completed} complétées`}
        icon={({ className }) => (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )}
        color="default"
      />
      <StatsCard
        title="Clients actifs"
        value={stats.clients.active}
        description={`sur ${stats.clients.total} total`}
        icon={({ className }) => (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )}
        color="success"
      />
      <StatsCard
        title="Interventions"
        value={stats.interventions.in_progress}
        description={`${stats.interventions.completed_today} complétées aujourd'hui`}
        icon={({ className }) => (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )}
        color="warning"
      />
      <StatsCard
        title="Stock faible"
        value={stats.inventory.low_stock}
        description={`${stats.inventory.out_of_stock} épuisés`}
        icon={({ className }) => (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
        color="danger"
      />
    </div>
  );
}
