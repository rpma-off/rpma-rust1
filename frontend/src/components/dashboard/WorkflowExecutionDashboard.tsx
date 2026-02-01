'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react';

interface TaskStats {
  total?: number;
  active?: number;
  completed?: number;
  pending?: number;
}

export interface WorkflowExecutionDashboardProps {
  taskStats?: TaskStats;
  onRefresh?: () => void;
  onExport?: (format: string) => void;
}

/**
 * Workflow execution dashboard component
 * Displays workflow execution metrics and status
 */
export function WorkflowExecutionDashboard({ taskStats }: WorkflowExecutionDashboardProps) {
  const total = taskStats?.total || 0;
  const active = taskStats?.active || 0;
  const completed = taskStats?.completed || 0;
  const pending = taskStats?.pending || 0;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    {
      label: 'Total des tâches',
      value: total,
      icon: PlayCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'En cours',
      value: active,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'Terminées',
      value: completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'En attente',
      value: pending,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Exécution des Workflows
          <Badge variant="secondary" className="text-xs">
            {completionRate}% terminé
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression globale</span>
              <span>{completed}/{total} tâches</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center space-x-3 p-3 rounded-lg border">
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Status Summary */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Résumé du statut</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• {active} tâches sont actuellement en cours d&apos;exécution</p>
              <p>• {completed} tâches ont été finalisées avec succès</p>
              <p>• {pending} tâches sont en attente de traitement</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}