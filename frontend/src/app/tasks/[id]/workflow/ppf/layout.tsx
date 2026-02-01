'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { PPFWorkflowProvider, usePPFWorkflow } from '@/contexts/PPFWorkflowContext';
import { PPFWorkflowHeader } from '@/components/workflow/ppf/PPFWorkflowHeader';
import { PPFStepProgress } from '@/components/workflow/ppf/PPFStepProgress';

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
  const { isLoading, error, interventionData } = usePPFWorkflow();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-border-light">Loading PPF workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Error Loading Workflow</h2>
          <p className="text-border-light mb-4">
            {error?.message || 'Failed to load intervention data'}
          </p>
          <p className="text-border-light text-sm mb-4">
            This might happen if the intervention was not started properly or if there are database issues.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              Back to Task
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
          <h2 className="text-xl font-bold text-foreground mb-2">No Active PPF Intervention</h2>
          <p className="text-border-light mb-4">
            An active PPF intervention must be started for this task before accessing the workflow.
          </p>
          <Button onClick={() => window.history.back()}>
            Back to Task
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