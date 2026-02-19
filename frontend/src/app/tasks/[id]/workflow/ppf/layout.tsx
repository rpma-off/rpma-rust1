'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/shared/ui';
import { AlertCircle } from 'lucide-react';
import { PPFWorkflowProvider, usePPFWorkflow, PPFWorkflowHeader, PPFStepProgress } from '@/domains/interventions';
import { useTranslation } from '@/shared/hooks';

interface PPFWorkflowLayoutProps {
  children: React.ReactNode;
}

export default function PPFWorkflowLayout({ children }: PPFWorkflowLayoutProps) {
  const params = useParams();
  const taskId = params.id as string;

  return (
    <PPFWorkflowProvider taskId={taskId}>
      <PPFWorkflowContent>
        {children}
      </PPFWorkflowContent>
    </PPFWorkflowProvider>
  );
}

function PPFWorkflowContent({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isLoading, error, interventionData } = usePPFWorkflow();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">{t('errors.loadFailed')}</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || t('errors.interventionDataUnavailable')}
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {t('errors.interventionDataRefreshFailed')}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>
              {t('common.retry')}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              {t('tasks.backToTasks')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!interventionData?.intervention) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">{t('errors.interventionDataUnavailable')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('errors.interventionDataUnavailable')}
          </p>
          <Button onClick={() => window.history.back()}>
            {t('tasks.backToTasks')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PPFWorkflowHeader />
      <PPFStepProgress />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
