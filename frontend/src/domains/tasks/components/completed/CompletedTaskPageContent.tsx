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
        <div className="space-y-3">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
          <AlertDescription>{t('tasks.notFoundById')}</AlertDescription>
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

      <div className="container mx-auto max-w-7xl px-4 py-6">
        <CompletedHero
          task={task}
          duration={duration}
          photoCount={photoCount}
          checklistCount={checklistCount}
          checklistTotal={checklistTotal}
          progressPercentage={progressPercentage}
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
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
                <CardTitle className="flex items-center gap-2 text-lg">
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

            <ChecklistSection
              checklistItems={task.checklist_items || []}
              checklistCount={checklistCount}
              checklistTotal={checklistTotal}
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
            />
          </div>
        </div>
      </div>

      <SelectedPhotoOverlay selectedPhoto={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </div>
  );
}
