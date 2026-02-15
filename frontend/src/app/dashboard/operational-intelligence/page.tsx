'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  BarChart3,
  RefreshCw,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/app/reports/components/DateRangePicker';
import { reportsService } from '@/lib/services/entities/reports.service';
import { useTranslation } from '@/hooks/useTranslation';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader, StatCard } from '@/components/ui/page-header';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import type {
  OperationalIntelligenceReport,
  StepBottleneck,
  InterventionBottleneck,
  ResourceUtilization,
  WorkflowRecommendation
} from '@/lib/backend';

interface DateRange {
  start: Date;
  end: Date;
}

export default function OperationalIntelligencePage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    end: new Date()
  });

  const [reportData, setReportData] = useState<OperationalIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load operational intelligence report
  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await reportsService.getOperationalIntelligenceReport(
          {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
          },
          {
            technician_ids: null,
            client_ids: null,
            statuses: null,
            priorities: null,
            ppf_zones: null,
            vehicle_models: null
          }
        );

        if (response.success && response.data) {
          setReportData(response.data);
        } else {
          setError(response.error || 'Failed to load operational intelligence report');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [dateRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Re-trigger the useEffect by updating dateRange slightly
    setDateRange(prev => ({ ...prev }));
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExport = async () => {
    try {
      const response = await reportsService.exportReport(
        'operational_intelligence',
        {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        },
        {
          technician_ids: null,
          client_ids: null,
          statuses: null,
          priorities: null,
          ppf_zones: null,
          vehicle_models: null
        },
        'pdf'
      );

      if (response.success && response.data && response.data.download_url && response.data.file_name) {
        const link = document.createElement('a');
        link.href = response.data.download_url;
        link.download = response.data.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <LoadingState message={t('common.loading')} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={handleRefresh} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <PageHeader
        title={t('nav.operationalIntelligence')}
        subtitle="Analyse des goulots d'étranglement et optimisation des processus"
        icon={<BarChart3 className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </>
        }
      />

      {/* Date Range Picker */}
      <Card className="border-[hsl(var(--rpma-border))]">
        <CardContent className="pt-6">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              value={reportData.step_bottlenecks.length}
              label="Goulots d'Étranglement Étapes"
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              value={reportData.intervention_bottlenecks.length}
              label="Interventions Bloquées"
              icon={Clock}
              color="yellow"
            />
            <StatCard
              value={reportData.recommendations.length}
              label="Recommandations"
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              value={`${Math.round(reportData.process_efficiency.overall_efficiency_score)}%`}
              label="Score d'Efficacité"
              icon={BarChart3}
              color="blue"
            />
          </div>

          {/* Step Bottlenecks */}
          <Card className="border-[hsl(var(--rpma-border))]">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Goulots d&apos;Étranglement par Étape
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Étapes qui causent des retards ou des problèmes de qualité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.step_bottlenecks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-500 mb-2">✓</div>
                  <p className="text-muted-foreground">Aucun goulot d&apos;étranglement détecté</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.step_bottlenecks.map((bottleneck, index) => (
                    <StepBottleneckCard key={index} bottleneck={bottleneck} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Intervention Bottlenecks */}
          <Card className="border-[hsl(var(--rpma-border))]">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                Interventions Bloquées
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Interventions qui restent trop longtemps dans le même état
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.intervention_bottlenecks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-500 mb-2">✓</div>
                  <p className="text-muted-foreground">Aucune intervention bloquée</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.intervention_bottlenecks.map((bottleneck, index) => (
                    <InterventionBottleneckCard key={index} bottleneck={bottleneck} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resource Utilization */}
          <Card className="border-[hsl(var(--rpma-border))]">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-500" />
                Utilisation des Ressources
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Répartition de la charge de travail par technicien
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.resource_utilization.map((resource, index) => (
                  <ResourceUtilizationCard key={index} resource={resource} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-[hsl(var(--rpma-border))]">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Recommandations d&apos;Amélioration
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Suggestions automatisées pour optimiser les processus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-500 mb-2">✓</div>
                  <p className="text-muted-foreground">Aucune recommandation disponible</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.recommendations.map((recommendation, index) => (
                    <RecommendationCard key={index} recommendation={recommendation} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}

// Component for step bottleneck cards
function StepBottleneckCard({ bottleneck }: { bottleneck: StepBottleneck }) {
  return (
    <div className="bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))] p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="destructive" className="text-xs">
              Étape {bottleneck.step_number}
            </Badge>
            <span className="text-foreground font-medium">{bottleneck.step_name}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Durée moyenne:</span>
              <div className="text-foreground font-semibold">{Math.round(bottleneck.average_duration_minutes)} min</div>
            </div>
            <div>
              <span className="text-muted-foreground">Taux d&apos;échec:</span>
              <div className="text-red-500 font-semibold">{Math.round(bottleneck.failure_rate * 100)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Taux de rework:</span>
              <div className="text-orange-500 font-semibold">{Math.round(bottleneck.rework_rate * 100)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Sévérité:</span>
              <div className="text-red-500 font-semibold capitalize">{bottleneck.bottleneck_severity}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for intervention bottleneck cards
function InterventionBottleneckCard({ bottleneck }: { bottleneck: InterventionBottleneck }) {
  return (
    <div className="bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))] p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-600 border-orange-200">
              Intervention #{bottleneck.intervention_id}
            </Badge>
            <span className="text-foreground font-medium">Étape {bottleneck.stuck_at_step}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Temps bloqué:</span>
              <div className="text-orange-500 font-semibold">{Math.round(bottleneck.time_at_current_step_hours)}h</div>
            </div>
            <div>
              <span className="text-muted-foreground">Technicien:</span>
              <div className="text-foreground font-semibold">{bottleneck.technician_name || 'Non assigné'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Priorité:</span>
              <Badge variant="outline" className="text-xs">
                {bottleneck.priority}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for resource utilization cards
function ResourceUtilizationCard({ resource }: { resource: ResourceUtilization }) {
  const utilizationPercentage = Math.round(resource.utilization_percentage);

  return (
    <div className="bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-foreground font-medium">{resource.technician_name}</span>
        <Badge variant="outline" className="text-xs">
          {utilizationPercentage}%
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Interventions actives:</span>
          <span className="text-foreground">{resource.active_interventions}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Complétées aujourd&apos;hui:</span>
          <span className="text-foreground">{resource.completed_today}</span>
        </div>
        <div className="w-full bg-[hsl(var(--rpma-border))] rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              utilizationPercentage > 90 ? 'bg-red-500' :
              utilizationPercentage > 70 ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

// Component for recommendation cards
function RecommendationCard({ recommendation }: { recommendation: WorkflowRecommendation }) {
  const priorityColors = {
    high: 'bg-red-50 text-red-600 border-red-200',
    medium: 'bg-orange-50 text-orange-600 border-orange-200',
    low: 'bg-green-50 text-green-600 border-green-200'
  };

  return (
    <div className={`rounded-lg border p-4 ${priorityColors[recommendation.priority as keyof typeof priorityColors] || priorityColors.medium}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="outline" className={`text-xs ${priorityColors[recommendation.priority as keyof typeof priorityColors] || priorityColors.medium}`}>
              {recommendation.priority.toUpperCase()}
            </Badge>
            <span className="text-foreground font-medium">{recommendation.recommendation_type}</span>
          </div>
          <p className="text-muted-foreground text-sm mb-3">{recommendation.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Score d&apos;impact:</span>
              <div className="text-green-600 font-semibold">{Math.round(recommendation.impact_score * 100)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Effort d&apos;implémentation:</span>
              <div className="text-foreground font-semibold capitalize">{recommendation.implementation_effort}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Étapes affectées:</span>
              <div className="text-foreground font-semibold">{recommendation.affected_steps.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
