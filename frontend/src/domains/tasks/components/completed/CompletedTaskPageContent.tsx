'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  PageShell,
  Skeleton,
} from '@/shared/ui/facade';
import { AlertTriangle } from 'lucide-react';
import {
  CompletedActionBar,
} from './CompletedActionBar';
import { CompletedHero } from './CompletedHero';
import { CompletedSidebar } from './CompletedSidebar';
import { SummaryStats } from './SummaryStats';
import { WorkflowCompletionTimeline } from './WorkflowCompletionTimeline';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Camera,
  CheckCircle,
  FileText,
  MessageSquare,
  Signature,
  Star,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from '@/shared/hooks';
import { useCompletedTaskPage } from '../../hooks/useCompletedTaskPage';

export function CompletedTaskPageContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    task,
    taskId,
    loading,
    error,
    customerInfo,
    customerDisplayName,
    fullInterventionData,
    workflowStepsArray,
    expandedWorkflowSteps,
    duration,
    photoCount,
    checklistCount,
    checklistTotal,
    progressPercentage,
    isExporting,
    exportProgress,
    lastExportTime,
    handleSaveReport,
    handleShareTask,
    handlePrintReport,
    handleDownloadDataJson,
    handleEditStep,
    handleDownloadStepData,
    toggleWorkflowStep,
  } = useCompletedTaskPage();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <CompletedActionBar
        onSaveReport={handleSaveReport}
        onDownloadDataJson={handleDownloadDataJson}
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
                  onEditStep={handleEditStep}
                  onDownloadStep={handleDownloadStepData}
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
                                ?
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

