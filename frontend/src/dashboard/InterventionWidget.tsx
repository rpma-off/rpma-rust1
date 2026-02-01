/**
 * Widget Dashboard - Interventions PPF
 * Affiche les interventions actives et métriques dans le dashboard principal
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  MapPin, 
  User, 
  ArrowRight, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import Link from 'next/link';


// Types
interface PPFIntervention {
  id: string;
  taskId: string;
  status: string;
  currentStep: number;
  interventionStartedAt: string | null;
  technicianId: string | null;
  temperatureCelsius: number | null;
  startLocation: { latitude: number; longitude: number } | null;
}

interface InterventionWidgetProps {
  className?: string;
  maxItems?: number;
}

export function InterventionWidget({ 
  className = '', 
  maxItems = 3 
}: InterventionWidgetProps) {
  const [activeInterventions, setActiveInterventions] = useState<PPFIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActiveInterventions = useCallback(async () => {
    try {
      const response = await fetch('/api/interventions?status=active&limit=' + maxItems);

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des interventions');
      }

      const data = await response.json();
      setActiveInterventions(data.interventions || []);
    } catch (error) {
      console.error('Erreur chargement interventions:', error);
      setError('Impossible de charger les interventions');
    } finally {
      setIsLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    loadActiveInterventions();
  }, [loadActiveInterventions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepName = (step: number) => {
    const steps = [
      'Démarrage',
      'Inspection',
      'Préparation', 
      'Installation',
      'Finalisation'
    ];
    return steps[step] || 'Étape inconnue';
  };

  const getStepProgress = (currentStep: number) => {
    return ((currentStep) / 4) * 100; // 4 étapes au total
  };

  const formatDuration = (startTime: string | null) => {
    if (!startTime) return 'Non démarrée';
    
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Interventions PPF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadActiveInterventions}
              className="mt-2"
            >
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Interventions PPF
          </CardTitle>
          <Link href="/dashboard/interventions">
            <Button variant="ghost" size="sm">
              Voir tout
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : activeInterventions.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Aucune intervention active
            </p>
            <p className="text-xs text-gray-500">
              Toutes les interventions sont terminées
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeInterventions.map((intervention) => (
              <div 
                key={intervention.id}
                className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(intervention.status)} variant="secondary">
                      {getStepName(intervention.currentStep)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      #{intervention.taskId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(intervention.interventionStartedAt)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Progression</span>
                    <span>{Math.round(getStepProgress(intervention.currentStep))}%</span>
                  </div>
                  <Progress 
                    value={getStepProgress(intervention.currentStep)} 
                    className="h-2"
                  />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      Tech#{intervention.technicianId?.slice(0, 6)}
                    </div>
                    {intervention.temperatureCelsius && (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {intervention.temperatureCelsius}°C
                      </div>
                    )}
                    {intervention.startLocation && (
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        Localisée
                      </div>
                    )}
                  </div>

                  <Link href={`/tasks/${intervention.taskId}/intervention`}>
                    <Button variant="outline" size="sm">
                      Continuer
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {/* Actions rapides */}
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs text-gray-500 mb-3">
                <span>Actions rapides</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/dashboard/interventions">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Historique
                  </Button>
                </Link>
                <Link href="/dashboard/interventions?tab=analytics">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Analytics
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}