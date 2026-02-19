/**
 * Page Dashboard des Interventions PPF
 * Vue d'ensemble des interventions actives, récentes et métriques
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/domains/auth';
import { useRouter } from 'next/navigation';
import { Activity, CheckCircle, Clock, TrendingUp, User, MapPin, Target, Link, SearchX } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Button } from '@/shared/ui/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { interventionDashboard } from '@/domains/interventions';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { getStatusLabel } from '@/shared/utils';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { StatCard } from '@/shared/ui/ui/page-header';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { ErrorState } from '@/shared/ui/layout/ErrorState';
import { EmptyState } from '@/shared/ui/layout/EmptyState';

export default function InterventionsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
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
        const activeInterventions = await interventionDashboard.getActive(user.token);
        setActiveInterventions((activeInterventions || []) as InterventionData[]);

        // Fetch recent interventions
        const recentInterventions = await interventionDashboard.getRecent(user.token);
        setRecentInterventions((recentInterventions || []) as InterventionData[]);

      } catch (err) {
        console.error('Error fetching interventions:', err);
        setError(err instanceof Error ? err.message : t('interventions.errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      fetchInterventions();
    }
  }, [user?.token, t]);

  if (authLoading || isLoading) {
    return (
      <PageShell>
        <LoadingState message={t('common.loading')} />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <ErrorState
          title={t('common.accessDenied')}
          message={t('common.mustBeLoggedIn')}
        />
      </PageShell>
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
      <PageShell>
        <LoadingState message={t('interventions.loadingInterventions')} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Tabs defaultValue="active" className="space-y-4">
        <div className="bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
          <div className="px-5 pt-4 pb-0">
            <h1 className="text-xl font-semibold">{t('dashboard.activity')}</h1>
          </div>
          <div className="px-2">
            <TabsList data-variant="underline" className="w-full justify-start">
              <TabsTrigger value="active" data-variant="underline">{t('dashboard.tabs.all')}</TabsTrigger>
              <TabsTrigger value="recent" data-variant="underline">{t('dashboard.tabs.jobs')}</TabsTrigger>
              <TabsTrigger value="analytics" data-variant="underline">{t('dashboard.tabs.events')}</TabsTrigger>
            </TabsList>
          </div>
        </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={totalActive}
          label={t('interventions.metrics.activeInterventions')}
          icon={Activity}
          color="accent"
        />
        <StatCard
          value={totalCompleted}
          label={t('interventions.metrics.completed7d')}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          value={`${Math.round(averageDuration)}${t('common.time.minutes')}`}
          label={t('interventions.metrics.averageDuration')}
          icon={Clock}
          color="blue"
        />
        <StatCard
          value="92%"
          label={t('interventions.metrics.efficiency')}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Tabs pour différentes vues */}
        {/* Interventions Actives */}
        <TabsContent value="active" className="space-y-4">
          {activeInterventions.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-8 w-8 text-muted-foreground" />}
              title={t('common.noResults')}
            />
          ) : (
            <div className="grid gap-4">
              {activeInterventions.map((intervention) => (
                <Card key={intervention.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                           <h3 className="font-semibold">
                             {t('interventions.intervention')} {intervention.task_id.slice(0, 8)}
                           </h3>
                           <Badge className={getStatusColor(intervention.status)}>
                             {getStatusLabel(intervention.status, 'intervention')}
                           </Badge>
                           <Badge variant="outline">
                             {t('interventions.step')} {intervention.currentStep}/4
                           </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                           <div className="flex items-center">
                             <User className="h-4 w-4 mr-1" />
                             {t('interventions.technician')} #{intervention.technician_id?.slice(0, 8)}
                           </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {intervention.interventionStartedAt 
                              ? format(new Date(intervention.interventionStartedAt), 'HH:mm', { locale: fr })
                              : t('interventions.notStarted')
                            }
                          </div>
                          {intervention.startLocation && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {t('interventions.located')}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            {intervention.temperatureCelsius || t('common.notAvailable')}Â°C
                          </div>
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between text-sm">
                             <span>{t('interventions.progress')}</span>
                             <span>{Math.round(getStepProgress(intervention.currentStep || 1))}%</span>
                           </div>
                           <Progress value={getStepProgress(intervention.currentStep || 1)} />
                        </div>
                      </div>

                       <div className="ml-6">
                         <Link href={`/tasks/${intervention.task_id}/intervention`}>
                           <Button>
                            {t('interventions.continue')}
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
            <EmptyState
              icon={<SearchX className="h-8 w-8 text-muted-foreground" />}
              title={t('common.noResults')}
            />
          ) : (
            <div className="grid gap-4">
              {recentInterventions.map((intervention) => (
                <Card key={intervention.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                         <div className="flex items-center space-x-3 mb-2">
                           <h3 className="font-semibold">
                             {t('interventions.intervention')} {intervention.task_id.slice(0, 8)}
                           </h3>
                           <Badge className={getStatusColor(intervention.status)}>
                             {getStatusLabel(intervention.status, 'intervention')}
                           </Badge>
                         </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">{t('interventions.duration')}:</span>
                            <br />
                            {intervention.totalDurationSeconds 
                              ? Math.round(intervention.totalDurationSeconds / 60) + ' ' + t('common.time.minutes')
                              : t('common.notAvailable')
                            }
                          </div>
                          <div>
                            <span className="font-medium">{t('interventions.avgQuality')}:</span>
                            <br />
                            {intervention.averageQualityScore?.toFixed(1) || t('common.notAvailable')}/10
                          </div>
                          <div>
                            <span className="font-medium">{t('interventions.surface')}:</span>
                            <br />
                            {intervention.totalSurfaceM2?.toFixed(1) || t('common.notAvailable')} mÂ²
                          </div>
                          <div>
                            <span className="font-medium">{t('interventions.efficiency')}:</span>
                            <br />
                            {intervention.materialsEfficiencyPercent || t('common.notAvailable')}%
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
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
                <CardTitle>{t('interventions.analytics.performanceByStep')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('interventions.steps.inspection')}</span>
                    <span className="text-sm font-medium">12 {t('common.time.minutes')} {t('common.average')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('interventions.steps.preparation')}</span>
                    <span className="text-sm font-medium">18 {t('common.time.minutes')} {t('common.average')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('interventions.steps.installation')}</span>
                    <span className="text-sm font-medium">45 {t('common.time.minutes')} {t('common.average')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('interventions.steps.finalization')}</span>
                    <span className="text-sm font-medium">8 {t('common.time.minutes')} {t('common.average')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('interventions.analytics.qualityTrends')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">+5%</p>
                  <p className="text-sm text-muted-foreground">
                    {t('interventions.analytics.qualityImprovementThisMonth')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}


