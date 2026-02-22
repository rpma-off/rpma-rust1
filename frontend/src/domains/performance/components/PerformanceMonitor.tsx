'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Zap, Database } from 'lucide-react';
import { usePerformance } from '../api';
import { SystemHealthCard } from './SystemHealthCard';
import { MetricsCard } from './MetricsCard';
import { PerformanceCharts } from './PerformanceCharts';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function PerformanceMonitor() {
  const { stats, cacheStats, systemHealth, loading, error, refreshStats, refreshCacheStats, refreshSystemHealth } = usePerformance();

  const handleRefreshAll = async () => {
    await Promise.all([refreshStats(), refreshCacheStats(), refreshSystemHealth()]);
  };

  if (loading && !stats && !cacheStats && !systemHealth) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Erreur lors du chargement des performances : {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Moniteur de performance</h2>
          <p className="text-muted-foreground text-sm">Surveillance système et cache</p>
        </div>
        <Button onClick={handleRefreshAll} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Opérations totales"
          value={stats?.total_operations?.toString() || '0'}
          icon={<Activity className="w-5 h-5" />}
          description="Depuis le début"
        />
        <MetricsCard
          title="Durée moyenne"
          value={`${stats?.avg_duration_ms?.toFixed(2) || '0'} ms`}
          icon={<Zap className="w-5 h-5" />}
          description="Par opération"
        />
        <MetricsCard
          title="Taux de succès"
          value={`${stats?.success_rate?.toFixed(1) || '0'}%`}
          icon={<Activity className="w-5 h-5" />}
          description="Toutes opérations"
        />
        <MetricsCard
          title="Entrées cache"
          value={cacheStats?.total_entries?.toString() || '0'}
          icon={<Database className="w-5 h-5" />}
          description="En mémoire"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthCard />
        <PerformanceCharts />
      </div>
    </div>
  );
}
