'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Activity, Users, Clock, Star } from 'lucide-react';
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
import { KpiCard } from './KpiCard';
import { AnalyticsChart } from './AnalyticsChart';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function AnalyticsDashboard() {
  const { summary, loading, error, refetch } = useAnalyticsSummary();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Erreur lors du chargement des analytiques : {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Aucune donnée analytique disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Vue d&apos;ensemble des performances</h2>
          <p className="text-muted-foreground text-sm">
            Dernière mise à jour : {lastRefresh.toLocaleString('fr-FR')}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-border text-foreground hover:bg-[hsl(var(--rpma-surface))]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total interventions"
          value={summary.total_interventions.toString()}
          icon={<Activity className="w-5 h-5" />}
          trend="neutral"
          description="Depuis le début"
        />

        <KpiCard
          title="Complétées aujourd'hui"
          value={summary.completed_today.toString()}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
          description="Tâches terminées aujourd'hui"
        />

        <KpiCard
          title="Techniciens actifs"
          value={summary.active_technicians.toString()}
          icon={<Users className="w-5 h-5" />}
          trend="neutral"
          description="En activité ce mois-ci"
        />

        <KpiCard
          title="Temps moyen de réalisation"
          value={`${summary.average_completion_time.toFixed(1)}h`}
          icon={<Clock className="w-5 h-5" />}
          trend="down"
          description="Heures par intervention"
        />

        <KpiCard
          title="Satisfaction client"
          value={`${summary.client_satisfaction_score.toFixed(1)}/5`}
          icon={<Star className="w-5 h-5" />}
          trend="up"
          description="Note moyenne"
        />

        <KpiCard
          title="Score de qualité"
          value={`${summary.quality_compliance_rate.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
          description="Taux de conformité"
        />

        <KpiCard
          title="Revenu mensuel"
          value={`€${summary.revenue_this_month.toLocaleString('fr-FR')}`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
          description="Ce mois-ci"
        />

        <KpiCard
          title="Rotation des stocks"
          value={summary.inventory_turnover.toFixed(1)}
          icon={<Activity className="w-5 h-5" />}
          trend="neutral"
          description="Taux annuel"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rpma-shell">
          <CardHeader>
            <CardTitle className="text-foreground">Tendance de complétion des tâches</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart
              type="line"
              data={[
                { label: 'Lun', value: 85 },
                { label: 'Mar', value: 92 },
                { label: 'Mer', value: 78 },
                { label: 'Jeu', value: 96 },
                { label: 'Ven', value: 88 },
                { label: 'Sam', value: 76 },
                { label: 'Dim', value: 82 },
              ]}
              color="#3B82F6"
            />
          </CardContent>
        </Card>

        <Card className="rpma-shell">
          <CardHeader>
            <CardTitle className="text-foreground">Types d&apos;intervention</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart
              type="pie"
              data={[
                { label: 'Installation PPF', value: 45 },
                { label: 'Maintenance', value: 25 },
                { label: 'Réparation', value: 20 },
                { label: 'Inspection', value: 10 },
              ]}
              colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444']}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[hsl(var(--rpma-teal))] rounded-full"></div>
                <div>
                  <p className="text-foreground font-medium">Tâche #1234 terminée</p>
                  <p className="text-muted-foreground text-sm">Installation PPF sur BMW X3</p>
                </div>
              </div>
              <span className="text-muted-foreground text-sm">Il y a 2 heures</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-foreground font-medium">Nouveau client inscrit</p>
                  <p className="text-muted-foreground text-sm">Forfait client premium</p>
                </div>
              </div>
              <span className="text-muted-foreground text-sm">Il y a 4 heures</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-foreground font-medium">Alerte stock faible</p>
                  <p className="text-muted-foreground text-sm">Stock de Film PPF en dessous du seuil</p>
                </div>
              </div>
              <span className="text-muted-foreground text-sm">Il y a 6 heures</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
