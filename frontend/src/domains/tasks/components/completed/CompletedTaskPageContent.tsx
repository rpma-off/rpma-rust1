'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileText } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  PageShell,
  Skeleton,
} from '@/shared/ui/facade';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/shared/hooks';
import { useCompletedTaskPage } from '../../hooks/useCompletedTaskPage';
import { CompletedActionBar } from './CompletedActionBar';
import { CompletedHero } from './CompletedHero';
import { CompletedSidebar } from './CompletedSidebar';
import { SummaryStats } from './SummaryStats';
import { WorkflowCompletionTimeline } from './WorkflowCompletionTimeline';
import {
  AuditTrailSection,
  ChecklistSection,
  MaterialsSection,
  PhotoGallerySection,
  QualitySection,
  SelectedPhotoOverlay,
} from './CompletedTaskSections';

function mapPhotoUrls(photos: unknown[] | null | undefined): string[] {
  return (photos || []).map((photo) => {
    if (typeof photo === 'string') return photo;
    if (photo && typeof photo === 'object') {
      const record = photo as Record<string, unknown>;
      return String(record.url || record.path || record.file_path || '');
    }
    return '';
  }).filter(Boolean);
}

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
    materials,
    workflowStepsArray,
    workflowSnapshot,
    expandedWorkflowSteps,
    duration,
    photoCount,
    allStepPhotoUrls,
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

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <div>
              <Skeleton className="h-96" />
            </div>
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
          <AlertDescription>{t('tasks.notFoundById')}</AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
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

      <PageShell>
        <div className="mx-auto max-w-7xl space-y-6">
          <CompletedHero
            task={task}
            duration={duration}
            photoCount={photoCount}
            checklistCount={workflowSnapshot.summary.completedSteps}
            checklistTotal={workflowSnapshot.summary.totalSteps}
            progressPercentage={progressPercentage}
            completedSteps={workflowSnapshot.summary.completedSteps}
            totalSteps={workflowSnapshot.summary.totalSteps}
            defectCount={workflowSnapshot.summary.defectCount}
            zonesCompleted={workflowSnapshot.summary.zonesCompleted}
            zonesTotal={workflowSnapshot.summary.zonesTotal}
          />

          <SummaryStats
            checklistCompleted={workflowSnapshot.summary.completedSteps}
            checklistTotal={workflowSnapshot.summary.totalSteps}
            photoCount={photoCount}
            satisfaction={fullInterventionData?.customer_satisfaction ?? workflowSnapshot.summary.customerSatisfaction}
            qualityScore={fullInterventionData?.quality_score ?? workflowSnapshot.summary.qualityScore}
            zonesCount={workflowSnapshot.summary.zonesTotal}
            duration={duration}
            customerName={customerDisplayName}
            defectCount={workflowSnapshot.summary.defectCount}
            completedSteps={workflowSnapshot.summary.completedSteps}
            totalSteps={workflowSnapshot.summary.totalSteps}
            signatureCaptured={workflowSnapshot.summary.hasSignature}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="rounded-xl border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-rpma-primary" />
                    {t('completed.workflowTimeline')}
                  </CardTitle>
                  <CardDescription>
                    {t('completed.workflowTimelineDesc')}
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

              <ChecklistSection
                checklistItems={[]}
                checklistCount={workflowSnapshot.summary.finalChecklistChecked}
                checklistTotal={workflowSnapshot.summary.finalChecklistTotal}
              />

              <QualitySection fullInterventionData={fullInterventionData} />

              <MaterialsSection materials={materials} />

              <PhotoGallerySection
                photoCount={photoCount}
                allStepPhotoUrls={allStepPhotoUrls}
                photosBefore={mapPhotoUrls(task.photos_before)}
                photosAfter={mapPhotoUrls(task.photos_after)}
                photosDuring={mapPhotoUrls(task.photos?.during)}
                onSelectPhoto={setSelectedPhoto}
              />

              <AuditTrailSection
                task={task}
                fullInterventionData={
                  fullInterventionData
                    ? {
                        id: fullInterventionData.id,
                        created_at: fullInterventionData.created_at,
                        updated_at: fullInterventionData.updated_at,
                      }
                    : null
                }
              />
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <CompletedSidebar
                  task={task}
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
                  duration={duration}
                  workflowSnapshot={workflowSnapshot.summary}
                />
              </div>
            </div>
          </div>
        </div>
      </PageShell>

      <SelectedPhotoOverlay selectedPhoto={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </div>
  );
}
