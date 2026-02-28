'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  PageShell,
  Skeleton,
} from '@/shared/ui/facade';
import { AlertTriangle } from 'lucide-react';
import {
  taskGateway,
  type TaskWithDetails,
  useCustomerInfo,
  useCustomerDisplayName,
  CompletedHero,
  WorkflowCompletionTimeline,
  CompletedActionBar,
  CompletedSidebar,
  SummaryStats,
} from '@/domains/tasks';
import { toast } from 'sonner';
import { reportsService } from '@/domains/reports';
import { getUserFullName } from '@/shared/utils';
import { useInterventionData, useWorkflowStepData, PPF_STEP_CONFIG } from '@/domains/interventions';
import type { Intervention } from '@/shared/types';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/shared/hooks';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/ui/card';
import { Separator } from '@/shared/ui/ui/separator';
import { Badge } from '@/shared/ui/ui/badge';
import {
  CheckCircle,
  FileText,
  Camera,
  Star,
  TrendingUp,
  MessageSquare,
  Signature,
} from 'lucide-react';

export default function TaskCompletedPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const { t } = useTranslation();

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWorkflowSteps, setExpandedWorkflowSteps] = useState<Set<string>>(new Set());

  const customerInfo = useCustomerInfo(task);
  const customerDisplayName = useCustomerDisplayName(task);

  const { data: interventionData } = useInterventionData(taskId);
  const workflowSteps = useWorkflowStepData(interventionData || null);
  const queryClient = useQueryClient();

  const fullInterventionData = interventionData as Intervention | null;

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [lastExportTime, setLastExportTime] = useState<Date | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) return;

      setLoading(true);
      setError(null);

      try {
        const result = await taskGateway.getTaskById(taskId);

        if (result.error) {
          throw new Error(result.error);
        }

        setTask(result.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch task');
        console.error('Error fetching task:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  const handleSaveReport = async () => {
    if (!task || !fullInterventionData) {
      toast.error(t('errors.interventionDataUnavailable'));
      return;
    }

    try {
      toast.info(t('reports.openingSaveDialog'));

      console.log('Page: Calling reportsService.saveInterventionReport for intervention:', fullInterventionData.id);
      const response = await reportsService.saveInterventionReport(fullInterventionData.id);

      console.log('Page: saveInterventionReport response:', {
        success: response.success,
        data: response.data
      });

      if (response.success && response.data) {
        toast.success(t('reports.pdfSavedSuccess', { path: response.data }));
      } else {
        throw new Error(t('reports.reportSaveFailed'));
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du rapport:', error);
      toast.error(t('reports.pdfSaveError'));
    }
  };

  const handleShareTask = () => {
    if (!task) return;

    const taskUrl = `${window.location.origin}/tasks/${task.id}`;
    navigator.clipboard.writeText(taskUrl).then(() => {
      toast.success(t('reports.linkCopied'));
    }).catch(() => {
      toast.error(t('reports.linkCopyError'));
    });
  };

  const handlePrintReport = async () => {
    if (!task || !fullInterventionData) {
      toast.error(t('errors.interventionDataUnavailable'));
      return;
    }

    if (isExporting) {
      toast.info(t('reports.exportInProgress'));
      return;
    }

    setIsExporting(true);
    setExportProgress(t('reports.preparingExport'));

    try {
      toast.info(t('reports.generatingReport'), {
        duration: 3000,
      });

      setExportProgress(t('reports.generatingPdf'));

      console.log('Invalidating and refetching intervention data for task:', taskId);
      await queryClient.invalidateQueries({
        queryKey: ['intervention-data', taskId]
      });
      await queryClient.refetchQueries({
        queryKey: ['intervention-data', taskId]
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const freshInterventionData = queryClient.getQueryData(['intervention-data', taskId]) as Intervention | null;
      console.log('Fresh intervention data after refetch:', {
        hasData: !!freshInterventionData,
        interventionId: freshInterventionData?.id,
        taskId
      });

      if (!freshInterventionData?.id) {
        throw new Error(t('errors.interventionDataRefreshFailed'));
      }

      setExportProgress(t('reports.generatingPdf'));

      console.log('Starting export for intervention:', freshInterventionData.id);
      const response = await reportsService.exportInterventionReport(
        freshInterventionData.id,
        { maxRetries: 2, retryDelay: 1500 }
      );

      if (response.success && response.data) {
        const reportData = response.data;

        if (!reportData.download_url && !reportData.file_path) {
          throw new Error(t('reports.reportGeneratedNoAccess'));
        }

        setExportProgress(t('reports.openingDocument'));
        setLastExportTime(new Date());

        const pdfUrl = reportData.download_url || `file://${reportData.file_path}`;
        const printWindow = window.open(pdfUrl, '_blank');

        if (printWindow) {
          printWindow.onload = () => {
            setExportProgress(t('reports.documentReadyForPrint'));
            toast.success(t('reports.reportOpenedSuccess'), {
              duration: 5000,
            });
          };

          printWindow.onerror = () => {
            toast.error(t('reports.pdfLoadError'));
          };

          setTimeout(() => {
            if (!printWindow.closed) {
              setExportProgress('');
              toast.success(t('reports.documentOpenedForPrint'));
            }
          }, 2000);

        } else {
          toast.error(t('reports.popupBlocked'), {
            duration: 8000,
            action: {
              label: t('common.retry'),
              onClick: () => handlePrintReport()
            }
          });
        }

      } else {
        const errorMessage = response.error || t('reports.reportGenerationFailed');

        if (errorMessage.includes('Authentification')) {
          toast.error(t('errors.sessionExpired'));
        } else if (errorMessage.includes('autorisation') || errorMessage.includes('permission')) {
          toast.error(t('errors.noPermissionToExport'));
        } else if (errorMessage.includes('tentatives')) {
          toast.error(t('errors.exportFailedRetry'));
        } else {
          toast.error(t('errors.exportError', { message: errorMessage }));
        }

        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);

      let errorMessage = t('errors.printPreparationError');

      if (error instanceof Error) {
        if (error.message.includes('popup') || error.message.includes('bloquée')) {
          errorMessage = t('errors.printWindowBlocked');
        } else if (error.message.includes('téléchargement')) {
          errorMessage = t('errors.fileAccessProblem');
        } else if (error.message.includes('timeout')) {
          errorMessage = t('errors.generationTimeout');
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, {
        duration: 6000,
        action: {
          label: t('common.retry'),
          onClick: () => handlePrintReport()
        }
      });

    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const calculateDuration = () => {
    if (!task?.start_time || !task?.end_time) return null;
    const start = new Date(task.start_time as string);
    const end = new Date(task.end_time as string);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMins}min`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('common.notDefined');
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return t('common.notDefined');
    try {
      return new Date(timeString).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return t('errors.invalidTime');
    }
  };

  const toggleWorkflowStep = (stepId: string) => {
    setExpandedWorkflowSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('errors.taskLoadError')}: {error}
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('tasks.notFoundById')}
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  const duration = calculateDuration();
  const photoCount = (task.photos_before?.length || 0) + (task.photos_after?.length || 0) + (task.photos?.during?.length || 0);
  const checklistCount = task.checklist_items?.filter((item: { is_completed?: boolean }) => item.is_completed).length || 0;
  const checklistTotal = task.checklist_items?.length || 0;
  const progressPercentage = interventionData?.progress_percentage || 100;

  const workflowStepsArray = Object.entries(workflowSteps).map(([stepId, stepData]) => ({
    id: stepId,
    title: PPF_STEP_CONFIG[stepId as keyof typeof PPF_STEP_CONFIG]?.label || stepId,
    status: stepData?.step_status || 'pending',
    completed_at: stepData?.completed_at,
    collected_data: stepData?.collected_data,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <CompletedActionBar
        onSaveReport={handleSaveReport}
        onShareTask={handleShareTask}
        onPrintReport={handlePrintReport}
        onBackToTask={() => router.push(`/tasks/${taskId}`)}
        onBackToTasks={() => router.push('/tasks')}
        isExporting={isExporting}
        exportProgress={exportProgress}
        lastExportTime={lastExportTime}
        taskId={taskId}
      />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <CompletedHero
          task={task as any}
          duration={duration}
          photoCount={photoCount}
          checklistCount={checklistCount}
          checklistTotal={checklistTotal}
          progressPercentage={progressPercentage}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <SummaryStats
              checklistCompleted={checklistCount}
              checklistTotal={checklistTotal}
              photoCount={photoCount}
              satisfaction={fullInterventionData?.customer_satisfaction || null}
              qualityScore={fullInterventionData?.quality_score || null}
              zonesCount={task.ppf_zones?.length || 0}
              duration={duration}
              customerName={customerDisplayName}
            />

            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  Workflow d&apos;Intervention
                </CardTitle>
                <CardDescription>
                  Chronologie détaillée de toutes les étapes complétées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowCompletionTimeline
                  steps={workflowStepsArray}
                  expandedSteps={expandedWorkflowSteps}
                  onToggleStep={toggleWorkflowStep}
                />
              </CardContent>
            </Card>

            {fullInterventionData && (
              <Card className="rounded-xl border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-600" />
                    Qualité & Satisfaction
                  </CardTitle>
                  <CardDescription>
                    Évaluation client et scores de qualité
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(fullInterventionData.customer_satisfaction !== null || fullInterventionData.quality_score !== null) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fullInterventionData.customer_satisfaction !== null && (
                        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-4 border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                              Satisfaction Client
                            </div>
                            <Star className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="text-3xl font-extrabold text-amber-600 mb-2">
                            {fullInterventionData.customer_satisfaction}/5
                          </div>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-lg ${i < fullInterventionData.customer_satisfaction! ? 'text-amber-500' : 'text-amber-200'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {fullInterventionData.quality_score !== null && (
                        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                              Score Qualité
                            </div>
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                          </div>
                          <div className="text-3xl font-extrabold text-purple-600 mb-2">
                            {fullInterventionData.quality_score}%
                          </div>
                          <div className="w-full bg-purple-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${fullInterventionData.quality_score}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {fullInterventionData.final_observations && fullInterventionData.final_observations.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          Observations Finales
                        </div>
                        <div className="space-y-2">
                          {fullInterventionData.final_observations.map((observation: string, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{observation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(fullInterventionData.customer_signature || fullInterventionData.customer_comments) && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Signature className="h-4 w-4 text-blue-600" />
                          Signature & Commentaires Client
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
                          {fullInterventionData.customer_signature && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
                                Signataire
                              </div>
                              <div className="text-sm font-medium text-blue-900">
                                {String(fullInterventionData.customer_signature)}
                              </div>
                            </div>
                          )}
                          {fullInterventionData.customer_comments && (
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
                                  Commentaires
                                </div>
                                <div className="text-sm text-blue-900 italic">
                                  &quot;{fullInterventionData.customer_comments}&quot;
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {photoCount > 0 && (
              <Card className="rounded-xl border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5 text-cyan-600" />
                    Galerie Photos
                  </CardTitle>
                  <CardDescription>
                    Photos documentées pendant l&apos;intervention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200 text-center">
                      <div className="text-3xl font-extrabold text-blue-600 mb-1">
                        {photoCount}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                        Total
                      </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200 text-center">
                      <div className="text-3xl font-extrabold text-emerald-600 mb-1">
                        {task.photos_before?.length || 0}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        Avant
                      </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 border border-purple-200 text-center">
                      <div className="text-3xl font-extrabold text-purple-600 mb-1">
                        {task.photos_after?.length || 0}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                        Après
                      </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-4 border border-amber-200 text-center">
                      <div className="text-3xl font-extrabold text-amber-600 mb-1">
                        {task.photos?.during?.length || 0}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                        Pendant
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Audit Trail
                </CardTitle>
                <CardDescription>
                  Informations système et historique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Tâche
                    </div>
                    <div className="space-y-1 text-gray-700">
                      <div><span className="font-medium">ID:</span> {task.id?.slice(-8) || 'N/A'}</div>
                      <div><span className="font-medium">Créé:</span> {task.created_at ? new Date(task.created_at).toLocaleString('fr-FR') : 'N/A'}</div>
                      <div><span className="font-medium">Modifié:</span> {task.updated_at ? new Date(task.updated_at as unknown as string).toLocaleString('fr-FR') : 'N/A'}</div>
                    </div>
                  </div>
                  {fullInterventionData && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Intervention
                      </div>
                      <div className="space-y-1 text-gray-700">
                        <div><span className="font-medium">ID:</span> {fullInterventionData.id?.slice(-8) || 'N/A'}</div>
                        <div><span className="font-medium">Créé:</span> {new Date(fullInterventionData.created_at as unknown as string).toLocaleString('fr-FR')}</div>
                        <div><span className="font-medium">Modifié:</span> {new Date(fullInterventionData.updated_at as unknown as string).toLocaleString('fr-FR')}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${task.synced ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <span className="text-gray-700">
                    {task.synced ? 'Synchronisé' : 'Non synchronisé'}
                  </span>
                  {task.last_synced_at && (
                    <span className="text-gray-500">
                      · Dernière sync: {new Date(task.last_synced_at as unknown as string).toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <CompletedSidebar
              task={task as any}
              customer={{
                name: customerDisplayName,
                email: customerInfo?.email,
                phone: customerInfo?.phone,
                address: customerInfo?.address,
              }}
              intervention={{
                temperature_celsius: fullInterventionData?.temperature_celsius || null,
                humidity_percentage: fullInterventionData?.humidity_percentage || null,
              }}
              workflowProgress={progressPercentage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
