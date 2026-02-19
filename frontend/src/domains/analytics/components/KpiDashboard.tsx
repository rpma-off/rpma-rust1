'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, RefreshCw, Target } from 'lucide-react';
import { useAnalyticsSummary } from '../hooks/useAnalyticsSummary';

interface KpiDefinition {
  key: 'completionRate' | 'qualityRate' | 'satisfaction' | 'avgCompletionHours' | 'monthlyRevenue' | 'inventoryTurnover';
  title: string;
  target: number;
  higherIsBetter: boolean;
  format: (value: number) => string;
}

const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    key: 'completionRate',
    title: 'Daily Completion Throughput',
    target: 10,
    higherIsBetter: true,
    format: (value) => `${Math.round(value)} tasks/day`,
  },
  {
    key: 'qualityRate',
    title: 'Quality Compliance',
    target: 98,
    higherIsBetter: true,
    format: (value) => `${value.toFixed(1)}%`,
  },
  {
    key: 'satisfaction',
    title: 'Customer Satisfaction',
    target: 4.7,
    higherIsBetter: true,
    format: (value) => `${value.toFixed(2)} / 5`,
  },
  {
    key: 'avgCompletionHours',
    title: 'Average Completion Time',
    target: 3,
    higherIsBetter: false,
    format: (value) => `${value.toFixed(2)} h`,
  },
  {
    key: 'monthlyRevenue',
    title: 'Monthly Revenue',
    target: 50000,
    higherIsBetter: true,
    format: (value) => `${value.toLocaleString('en-US')} EUR`,
  },
  {
    key: 'inventoryTurnover',
    title: 'Inventory Turnover',
    target: 9,
    higherIsBetter: true,
    format: (value) => value.toFixed(2),
  },
];

export function KpiDashboard() {
  const { summary, loading, error, refetch } = useAnalyticsSummary();

  const metrics = useMemo(() => {
    if (!summary) return [];

    const values: Record<KpiDefinition['key'], number> = {
      completionRate: summary.completed_today,
      qualityRate: summary.quality_compliance_rate,
      satisfaction: summary.client_satisfaction_score,
      avgCompletionHours: summary.average_completion_time,
      monthlyRevenue: summary.revenue_this_month,
      inventoryTurnover: summary.inventory_turnover,
    };

    return KPI_DEFINITIONS.map((definition) => {
      const actual = values[definition.key];
      const rawProgress = definition.higherIsBetter
        ? (actual / definition.target) * 100
        : (definition.target / Math.max(actual, 0.0001)) * 100;
      const progress = Math.max(0, Math.min(100, rawProgress));
      const status = progress >= 100 ? 'on-target' : progress >= 85 ? 'watch' : 'off-target';

      return {
        ...definition,
        actual,
        progress,
        status,
      };
    });
  }, [summary]);

  if (loading) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading KPI dashboard...</CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5" />
            KPI Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Unable to load KPI metrics. {error ? `Details: ${error}` : ''}
          </p>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rpma-shell">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5" />
            KPI Dashboard
          </CardTitle>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          KPI snapshot last updated on {new Date(summary.last_updated).toLocaleString('fr-FR')}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-md border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{metric.title}</p>
                <p className="text-xs text-muted-foreground">
                  Current: {metric.format(metric.actual)} | Target: {metric.format(metric.target)}
                </p>
              </div>
              {metric.status === 'on-target' ? (
                <Badge className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  On target
                </Badge>
              ) : metric.status === 'watch' ? (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Watch
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Off target
                </Badge>
              )}
            </div>
            <Progress value={metric.progress} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
