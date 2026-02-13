'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Workflow, Clock, AlertTriangle, CheckCircle, RefreshCw, Download, TrendingUp, TrendingDown } from 'lucide-react';
import type { WorkflowExecution } from '@/types/workflow.types';

export interface WorkflowExecutionDashboardProps {
  data?: WorkflowExecution[];
  onWorkflowSelect?: (workflowId: string) => void;
  onRefresh?: () => void;
  onExport?: (format: string) => void;
}

// Mock data for demonstration
const mockWorkflowData = {
  totalWorkflows: 156,
  activeWorkflows: 23,
  completedToday: 12,
  averageCompletionTime: '4h 32m',
  onTimeCompletionRate: 87.3,
  bottlenecks: [
    {
      id: '1',
      step: 'Surface Preparation',
      averageTime: '2h 15m',
      status: 'bottleneck',
      description: 'Temps d\'attente élevé pour le nettoyage de surface'
    },
    {
      id: '2',
      step: 'Quality Inspection',
      averageTime: '1h 45m',
      status: 'normal',
      description: 'Contrôle qualité dans les délais normaux'
    },
    {
      id: '3',
      step: 'Film Application',
      averageTime: '3h 20m',
      status: 'bottleneck',
      description: 'Application de film prend plus de temps que prévu'
    }
  ],
  recentExecutions: [
    {
      id: '1',
      interventionId: 'INT-2024-001',
      status: 'in_progress',
      currentStep: 'Film Application',
      progress: 75,
      startTime: '2024-12-12T08:30:00Z',
      estimatedCompletion: '2024-12-12T13:00:00Z',
      technician: 'Jean Dupont'
    },
    {
      id: '2',
      interventionId: 'INT-2024-002',
      status: 'completed',
      currentStep: 'Final Inspection',
      progress: 100,
      startTime: '2024-12-11T09:00:00Z',
      estimatedCompletion: '2024-12-11T14:30:00Z',
      technician: 'Marie Martin'
    },
    {
      id: '3',
      interventionId: 'INT-2024-003',
      status: 'pending',
      currentStep: 'Surface Preparation',
      progress: 0,
      startTime: null,
      estimatedCompletion: '2024-12-12T16:00:00Z',
      technician: 'Pierre Durand'
    }
  ],
  performanceMetrics: {
    efficiency: 92.1,
    resourceUtilization: 78.5,
    qualityScore: 8.7,
    customerSatisfaction: 4.5
  }
};

/**
 * Workflow execution dashboard component
 * Displays workflow execution metrics and status
 */
export function WorkflowExecutionDashboard({
  data,
  onWorkflowSelect,
  onRefresh,
  onExport
}: WorkflowExecutionDashboardProps) {
  const [workflowData, setWorkflowData] = useState(mockWorkflowData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (data && data.length > 0) {
      setWorkflowData(prev => ({
        ...prev,
        totalWorkflows: data.length,
        activeWorkflows: data.filter((w: WorkflowExecution) => w.status === 'in_progress').length,
        completedToday: data.filter((w: WorkflowExecution) => {
          if (!w.completed_at) return false;
          const today = new Date();
          const completedDate = new Date(w.completed_at);
          return completedDate.toDateString() === today.toDateString();
        }).length,
      }));
    }
  }, [data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'delayed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Workflow className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'delayed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Workflow className="h-4 w-4" />;
    }
  };

  const getBottleneckColor = (status: string) => {
    return status === 'bottleneck' ? 'text-red-600' : 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Exécution des Workflows</h2>
          <p className="text-muted-foreground">Suivi des workflows et identification des goulots d&apos;étranglement</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows Actifs</CardTitle>
            <Workflow className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowData.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sur {workflowData.totalWorkflows} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complétés Aujourd&apos;hui</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{workflowData.completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {workflowData.onTimeCompletionRate}% dans les délais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps Moyen</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowData.averageCompletionTime}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Par intervention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficacité</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{workflowData.performanceMetrics.efficiency}%</div>
            <Progress value={workflowData.performanceMetrics.efficiency} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Score d&apos;efficacité global
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle>Goulots d&apos;Étranglement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowData.bottlenecks.map((bottleneck) => (
              <div key={bottleneck.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {bottleneck.status === 'bottleneck' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{bottleneck.step}</span>
                      <Badge variant={bottleneck.status === 'bottleneck' ? 'destructive' : 'default'}>
                        {bottleneck.status === 'bottleneck' ? 'Goulot' : 'Normal'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{bottleneck.description}</p>
                  </div>
                </div>
                <div className={`text-right ${getBottleneckColor(bottleneck.status)}`}>
                  <div className="font-medium">{bottleneck.averageTime}</div>
                  <div className="text-sm">Temps moyen</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Exécutions Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowData.recentExecutions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => onWorkflowSelect?.(execution.id)}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(execution.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{execution.interventionId}</span>
                      <Badge className={getStatusColor(execution.status)}>
                        {execution.status === 'in_progress' ? 'En cours' :
                         execution.status === 'completed' ? 'Terminé' :
                         execution.status === 'pending' ? 'En attente' : 'Retardé'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Étape: {execution.currentStep} • Technicien: {execution.technician}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={execution.progress} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{execution.progress}%</span>
                    </div>
                    {execution.startTime && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Démarré: {new Date(execution.startTime).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
                {execution.estimatedCompletion && (
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {new Date(execution.estimatedCompletion).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="text-muted-foreground">Fin estimée</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Métriques de Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Utilisation des ressources</span>
              <span className="font-medium">{workflowData.performanceMetrics.resourceUtilization}%</span>
            </div>
            <Progress value={workflowData.performanceMetrics.resourceUtilization} />

            <div className="flex justify-between items-center">
              <span className="text-sm">Score qualité</span>
              <span className="font-medium">{workflowData.performanceMetrics.qualityScore}/10</span>
            </div>
            <Progress value={workflowData.performanceMetrics.qualityScore * 10} />

            <div className="flex justify-between items-center">
              <span className="text-sm">Satisfaction client</span>
              <span className="font-medium">{workflowData.performanceMetrics.customerSatisfaction}/5 ⭐</span>
            </div>
            <Progress value={(workflowData.performanceMetrics.customerSatisfaction / 5) * 100} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimisations Recommandées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <span className="font-medium">Réduire les goulots d&apos;étranglement</span>
                  <p className="text-muted-foreground">Optimiser les étapes de préparation de surface et d&apos;application de film</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <span className="font-medium">Améliorer l&apos;efficacité</span>
                  <p className="text-muted-foreground">Maintenir le taux de {workflowData.onTimeCompletionRate}% de livraisons dans les délais</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Workflow className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <span className="font-medium">Automatisation</span>
                  <p className="text-muted-foreground">Considérer l&apos;automatisation des contrôles qualité répétitifs</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}