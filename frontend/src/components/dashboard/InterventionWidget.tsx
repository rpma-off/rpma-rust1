"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Wrench, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InterventionWidgetProps {
  className?: string;
}

export function InterventionWidget({ className }: InterventionWidgetProps) {
  // Mock intervention data
  const interventions = [
    {
      id: '1',
      title: 'Installation PPF complète',
      progress: 75,
      status: 'in_progress' as const,
      technician: 'Jean Dupont',
      estimatedTime: '2h',
      remainingTime: '30min'
    },
    {
      id: '2',
      title: 'Réparation dommage',
      progress: 100,
      status: 'completed' as const,
      technician: 'Marie Martin',
      estimatedTime: '1h',
      remainingTime: '0min'
    },
    {
      id: '3',
      title: 'Contrôle qualité',
      progress: 45,
      status: 'in_progress' as const,
      technician: 'Pierre Durand',
      estimatedTime: '45min',
      remainingTime: '25min'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeInterventions = interventions.filter(i => i.status === 'in_progress').length;
  const completedToday = interventions.filter(i => i.status === 'completed').length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Interventions
        </CardTitle>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activeInterventions}</div>
              <div className="text-xs text-muted-foreground">En cours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedToday}</div>
              <div className="text-xs text-muted-foreground">Terminées</div>
            </div>
          </div>

          {/* Recent Interventions */}
          <div className="space-y-3">
            {interventions.slice(0, 3).map((intervention) => (
              <div key={intervention.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{intervention.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {intervention.technician} • {intervention.remainingTime} restant
                    </p>
                  </div>
                  <Badge className={getStatusColor(intervention.status)} variant="secondary">
                    {intervention.status === 'completed' ? 'Terminé' :
                     intervention.status === 'in_progress' ? 'En cours' : 'En attente'}
                  </Badge>
                </div>
                <Progress value={intervention.progress} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}