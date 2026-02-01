'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  BarChart3,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/app/reports/components/DateRangePicker';
import { reportsService } from '@/lib/services/entities/reports.service';
import type {
  OperationalIntelligenceReport,
  StepBottleneck,
  InterventionBottleneck,
  ResourceUtilization,
  ProcessEfficiencyMetrics,
  WorkflowRecommendation
} from '@/lib/backend';

interface DateRange {
  start: Date;
  end: Date;
}

export default function OperationalIntelligencePage() {
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
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-8 h-8 animate-spin text-green-500" />
            <span className="text-white text-lg font-medium">Chargement du rapport d&apos;intelligence opérationnelle...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="bg-red-900/20 border-red-500/30 max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Erreur de chargement</h3>
              <p className="text-red-300 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="border-red-500 text-red-300 hover:bg-red-900/30">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Intelligence Opérationnelle</h1>
          <p className="text-gray-400 mt-1">Analyse des goulots d&apos;étranglement et optimisation des processus</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 hover:bg-gray-800"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 hover:bg-gray-800"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card className="bg-gray-800 border-gray-700">
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
            <MetricCard
              title="Goulots d'Étranglement Étapes"
              value={reportData.step_bottlenecks.length}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="red"
              description="Étapes identifiées comme problématiques"
            />
            <MetricCard
              title="Interventions Bloquées"
              value={reportData.intervention_bottlenecks.length}
              icon={<Clock className="h-5 w-5" />}
              color="orange"
              description="Interventions en attente prolongée"
            />
            <MetricCard
              title="Recommandations"
              value={reportData.recommendations.length}
              icon={<TrendingUp className="h-5 w-5" />}
              color="green"
              description="Suggestions d'amélioration"
            />
            <MetricCard
              title="Score d'Efficacité"
              value={`${Math.round(reportData.process_efficiency.overall_efficiency_score)}%`}
              icon={<BarChart3 className="h-5 w-5" />}
              color="blue"
              description="Performance globale des processus"
            />
          </div>

          {/* Step Bottlenecks */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                Goulots d&apos;Étranglement par Étape
              </CardTitle>
              <CardDescription className="text-gray-400">
                Étapes qui causent des retards ou des problèmes de qualité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.step_bottlenecks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-400 mb-2">✓</div>
                  <p className="text-gray-400">Aucun goulot d&apos;étranglement détecté</p>
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
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-400" />
                Interventions Bloquées
              </CardTitle>
              <CardDescription className="text-gray-400">
                Interventions qui restent trop longtemps dans le même état
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.intervention_bottlenecks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-400 mb-2">✓</div>
                  <p className="text-gray-400">Aucune intervention bloquée</p>
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
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-400" />
                Utilisation des Ressources
              </CardTitle>
              <CardDescription className="text-gray-400">
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
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                Recommandations d&apos;Amélioration
              </CardTitle>
              <CardDescription className="text-gray-400">
                Suggestions automatisées pour optimiser les processus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-400 mb-2">✓</div>
                  <p className="text-gray-400">Aucune recommandation disponible</p>
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
    </div>
  );
}

// Component for metric cards
function MetricCard({
  title,
  value,
  icon,
  color,
  description
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'red' | 'orange' | 'green' | 'blue';
  description: string;
}) {
  const colorClasses = {
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg ${colorClasses[color]} border`}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{value}</div>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Component for step bottleneck cards
function StepBottleneckCard({ bottleneck }: { bottleneck: StepBottleneck }) {
  return (
    <div className="bg-gray-900/50 rounded-lg border border-red-500/20 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="destructive" className="text-xs">
              Étape {bottleneck.step_number}
            </Badge>
            <span className="text-white font-medium">{bottleneck.step_name}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Durée moyenne:</span>
              <div className="text-white font-semibold">{Math.round(bottleneck.average_duration_minutes)} min</div>
            </div>
            <div>
              <span className="text-gray-400">Taux d&apos;échec:</span>
              <div className="text-red-400 font-semibold">{Math.round(bottleneck.failure_rate * 100)}%</div>
            </div>
            <div>
              <span className="text-gray-400">Taux de rework:</span>
              <div className="text-orange-400 font-semibold">{Math.round(bottleneck.rework_rate * 100)}%</div>
            </div>
            <div>
              <span className="text-gray-400">Sévérité:</span>
              <div className="text-red-400 font-semibold capitalize">{bottleneck.bottleneck_severity}</div>
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
    <div className="bg-gray-900/50 rounded-lg border border-orange-500/20 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-400">
              Intervention #{bottleneck.intervention_id}
            </Badge>
            <span className="text-white font-medium">Étape {bottleneck.stuck_at_step}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Temps bloqué:</span>
              <div className="text-orange-400 font-semibold">{Math.round(bottleneck.time_at_current_step_hours)}h</div>
            </div>
            <div>
              <span className="text-gray-400">Technicien:</span>
              <div className="text-white font-semibold">{bottleneck.technician_name || 'Non assigné'}</div>
            </div>
            <div>
              <span className="text-gray-400">Priorité:</span>
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
    <div className="bg-gray-900/50 rounded-lg border border-gray-600 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-medium">{resource.technician_name}</span>
        <Badge variant="outline" className="text-xs">
          {utilizationPercentage}%
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Interventions actives:</span>
          <span className="text-white">{resource.active_interventions}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Complétées aujourd&apos;hui:</span>
          <span className="text-white">{resource.completed_today}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
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
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  return (
    <div className={`rounded-lg border p-4 ${priorityColors[recommendation.priority as keyof typeof priorityColors] || priorityColors.medium}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="outline" className={`text-xs ${priorityColors[recommendation.priority as keyof typeof priorityColors] || priorityColors.medium}`}>
              {recommendation.priority.toUpperCase()}
            </Badge>
            <span className="text-white font-medium">{recommendation.recommendation_type}</span>
          </div>
          <p className="text-gray-300 text-sm mb-3">{recommendation.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Score d&apos;impact:</span>
              <div className="text-green-400 font-semibold">{Math.round(recommendation.impact_score * 100)}%</div>
            </div>
            <div>
              <span className="text-gray-400">Effort d&apos;implémentation:</span>
              <div className="text-white font-semibold capitalize">{recommendation.implementation_effort}</div>
            </div>
            <div>
              <span className="text-gray-400">Étapes affectées:</span>
              <div className="text-white font-semibold">{recommendation.affected_steps.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}