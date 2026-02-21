"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, CheckCircle, Clock, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsGridProps } from './types';

export function StatsGrid({ stats, className }: StatsGridProps) {
  // Use real stats from props
  const statsData = [
    {
      title: 'Tâches Totales',
      value: stats.total.toString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: Activity,
      description: 'Ce mois-ci'
    },
    {
      title: 'Tâches Terminées',
      value: stats.completed.toString(),
      change: '+8%',
      changeType: 'positive' as const,
      icon: CheckCircle,
      description: `Taux de completion: ${stats.completionRate}%`
    },
    {
      title: 'Tâches en Cours',
      value: stats.inProgress.toString(),
      change: '-2%',
      changeType: 'negative' as const,
      icon: Clock,
      description: 'En attente de validation'
    },
    {
      title: 'Tâches en Attente',
      value: stats.pending.toString(),
      change: '+1',
      changeType: 'negative' as const,
      icon: AlertTriangle,
      description: 'Nécessitent attention'
    },
    {
      title: 'Techniciens Actifs',
      value: Math.ceil(stats.avgTasksPerTechnician).toString(),
      change: '+2',
      changeType: 'positive' as const,
      icon: Users,
      description: 'Équipe complète'
    },
    {
      title: 'Temps Moyen',
      value: `${stats.averageCompletionTime}h`,
      change: '-0.2h',
      changeType: 'positive' as const,
      icon: Clock,
      description: 'Par tâche'
    }
  ];

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
                <Badge
                  variant={stat.changeType === 'positive' ? 'default' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {stat.changeType === 'positive' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}