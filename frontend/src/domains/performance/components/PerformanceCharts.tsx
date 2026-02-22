'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, LineChart, TrendingUp } from 'lucide-react';
import { usePerformance } from '../api';

export function PerformanceCharts() {
  const { metrics } = usePerformance();

  const operationCounts = metrics?.reduce((acc, metric) => {
    acc[metric.operation] = (acc[metric.operation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const avgDurationByOperation = metrics?.reduce((acc, metric) => {
    if (!acc[metric.operation]) {
      acc[metric.operation] = { total: 0, count: 0 };
    }
    acc[metric.operation].total += metric.duration_ms;
    acc[metric.operation].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>) || {};

  const chartData = Object.entries(operationCounts).map(([operation, count]) => ({
    operation,
    count,
    avgDuration: avgDurationByOperation[operation] ? (avgDurationByOperation[operation].total / avgDurationByOperation[operation].count).toFixed(2) : '0',
  })).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          Statistiques des opérations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {chartData.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </div>
          ) : (
            <div className="space-y-3">
              {chartData.map((item, index) => (
                <div key={item.operation} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{item.operation}</span>
                      <span className="text-sm text-muted-foreground">{item.count} ops</span>
                    </div>
                    <div className="h-2 bg-[hsl(var(--rpma-surface-light))] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--rpma-primary))]"
                        style={{ width: `${(item.count / chartData[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <div className="text-xs text-muted-foreground">Durée moy.</div>
                    <div className="text-sm font-medium text-foreground">{item.avgDuration} ms</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
