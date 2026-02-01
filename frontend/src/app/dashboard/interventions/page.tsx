/**
 * Page Dashboard des Interventions PPF
 * Vue d'ensemble des interventions actives, récentes et métriques
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/compatibility';
import { useRouter } from 'next/navigation';
import { Loader2, Activity, CheckCircle, Clock, TrendingUp, User, MapPin, Target, Link, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { InterventionWorkflowService } from '@/lib/services/ppf/intervention-workflow.service';

export default function InterventionsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Type for intervention data
  interface InterventionData {
    id: string;
    status: string;
    totalDurationSeconds?: number;
    technician_id?: string;
    task_id: string;
    created_at: string;
    updated_at: string;
    // CamelCase versions for UI compatibility
    taskId?: string;
    currentStep?: number;
    technicianId?: string;
    interventionStartedAt?: string;
    startLocation?: GeolocationPosition;
    temperatureCelsius?: number;
    // Additional metrics for recent interventions
    averageQualityScore?: number;
    totalSurfaceM2?: number;
    materialsEfficiencyPercent?: number;
    interventionCompletedAt?: string;
    [key: string]: unknown;
  }

  // Move all hooks to the top, before any conditional logic
  const [activeInterventions, setActiveInterventions] = useState<InterventionData[]>([]);
  const [recentInterventions, setRecentInterventions] = useState<InterventionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      setIsLoading(false);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchInterventions = async () => {
      if (!user?.token) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch active interventions
        const activeInterventions = await InterventionWorkflowService.getActive(user.token);
        setActiveInterventions(activeInterventions || []);

        // Fetch recent interventions
        const recentInterventions = await InterventionWorkflowService.getRecent(user.token);
        setRecentInterventions(recentInterventions || []);

      } catch (err) {
        console.error('Error fetching interventions:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des interventions');
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      fetchInterventions();
    }
  }, [user?.token]);

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalActive = activeInterventions.length;
  const totalCompleted = recentInterventions.filter(i => i.status === 'completed').length;
  const averageDuration = recentInterventions.length > 0
    ? recentInterventions.reduce((acc, i) => acc + (i.totalDurationSeconds || 0), 0) / recentInterventions.length / 60
    : 0;

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

  const getStepProgress = (currentStep: number) => {
    return ((currentStep) / 4) * 100; // 4 étapes au total
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement des interventions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Erreur</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Interventions PPF</h1>
          <p className="text-gray-600">
            Vue d&apos;ensemble des interventions actives et métriques de performance
          </p>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions Actives</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
            <p className="text-xs text-muted-foreground">
              En cours d&apos;exécution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complétées (7j)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompleted}</div>
            <p className="text-xs text-muted-foreground">
              Cette semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durée Moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(averageDuration)}min</div>
            <p className="text-xs text-muted-foreground">
              Par intervention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficacité</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">
              Taux de succès
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs pour différentes vues */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Interventions Actives</TabsTrigger>
          <TabsTrigger value="recent">Historique Récent</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Interventions Actives */}
        <TabsContent value="active" className="space-y-4">
          {activeInterventions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune intervention active</h3>
                <p className="text-gray-600">
                  Toutes les interventions sont terminées ou en attente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeInterventions.map((intervention) => (
                <Card key={intervention.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                           <h3 className="font-semibold">
                             Intervention {intervention.task_id.slice(0, 8)}
                           </h3>
                           <Badge className={getStatusColor(intervention.status)}>
                             {intervention.status}
                           </Badge>
                           <Badge variant="outline">
                             Étape {intervention.currentStep}/4
                           </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                           <div className="flex items-center">
                             <User className="h-4 w-4 mr-1" />
                             Technicien #{intervention.technician_id?.slice(0, 8)}
                           </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {intervention.interventionStartedAt 
                              ? format(new Date(intervention.interventionStartedAt), 'HH:mm', { locale: fr })
                              : 'Non démarrée'
                            }
                          </div>
                          {intervention.startLocation && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              Localisée
                            </div>
                          )}
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            {intervention.temperatureCelsius || 'N/A'}°C
                          </div>
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between text-sm">
                             <span>Progression</span>
                             <span>{Math.round(getStepProgress(intervention.currentStep || 1))}%</span>
                           </div>
                           <Progress value={getStepProgress(intervention.currentStep || 1)} />
                        </div>
                      </div>

                       <div className="ml-6">
                         <Link href={`/tasks/${intervention.task_id}/intervention`}>
                           <Button>
                            Continuer
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Historique Récent */}
        <TabsContent value="recent" className="space-y-4">
          {recentInterventions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune intervention récente</h3>
                <p className="text-gray-600">
                  Aucune intervention n&apos;a été effectuée ces 7 derniers jours.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recentInterventions.map((intervention) => (
                <Card key={intervention.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                         <div className="flex items-center space-x-3 mb-2">
                           <h3 className="font-semibold">
                             Intervention {intervention.task_id.slice(0, 8)}
                           </h3>
                           <Badge className={getStatusColor(intervention.status)}>
                             {intervention.status}
                           </Badge>
                         </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Durée:</span>
                            <br />
                            {intervention.totalDurationSeconds 
                              ? Math.round(intervention.totalDurationSeconds / 60) + ' min'
                              : 'N/A'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Qualité moyenne:</span>
                            <br />
                            {intervention.averageQualityScore?.toFixed(1) || 'N/A'}/10
                          </div>
                          <div>
                            <span className="font-medium">Surface:</span>
                            <br />
                            {intervention.totalSurfaceM2?.toFixed(1) || 'N/A'} m²
                          </div>
                          <div>
                            <span className="font-medium">Efficacité:</span>
                            <br />
                            {intervention.materialsEfficiencyPercent || 'N/A'}%
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-500">
                        {intervention.interventionCompletedAt &&
                          format(new Date(intervention.interventionCompletedAt), 'dd/MM/yyyy HH:mm', { locale: fr })
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance par Étape</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Inspection</span>
                    <span className="text-sm font-medium">12 min avg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Préparation</span>
                    <span className="text-sm font-medium">18 min avg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Installation</span>
                    <span className="text-sm font-medium">45 min avg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Finalisation</span>
                    <span className="text-sm font-medium">8 min avg</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendances Qualité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">+5%</p>
                  <p className="text-sm text-gray-600">
                    Amélioration qualité ce mois
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}