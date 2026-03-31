'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { StepType } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { ErrorState } from '@/shared/ui/layout/ErrorState';
import { getPPFStepPath } from '../../utils/ppf-workflow';
import { usePpfWorkflow } from '../../hooks/usePpfWorkflow';
import { PpfHeaderBand } from './PpfHeaderBand';
import { PpfStepperBand } from './PpfStepperBand';
import { PPF_STEP_CONFIG } from './ppfWorkflow.config';

type ActionBarConfig = {
  summary?: string;
  onSaveDraft?: () => void;
  onDownloadData?: () => void;
  onValidate?: () => void;
  downloadLabel?: string;
  validateLabel?: string;
  saveDisabled?: boolean;
  downloadDisabled?: boolean;
  validateDisabled?: boolean;
  isSaving?: boolean;
  isValidating?: boolean;
};

export type PpfDraftGuard = {
  hasPendingDraft: boolean;
  saveNow: () => Promise<boolean>;
};

type PpfWorkflowLayoutProps = {
  stepId?: StepType;
  actionBar?: ActionBarConfig;
  draftGuard?: PpfDraftGuard;
  children: React.ReactNode;
};

export function PpfWorkflowLayout({
  stepId,
  actionBar,
  draftGuard,
  children,
}: PpfWorkflowLayoutProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const {
    taskId,
    task,
    intervention,
    steps,
    stepsData,
    currentStep,
    allowedStepId,
    canAccessStep,
    isLoading,
    error,
  } = usePpfWorkflow();
  const hasBackendSteps = Boolean(stepsData?.steps && stepsData.steps.length > 0);

  const stepLabel = useMemo(() => {
    if (!currentStep) return 'Parcours terminé';
    const index = steps.findIndex((step) => step.id === currentStep.id);
    if (index < 0) return 'Parcours PPF';
    return `Étape ${index + 1} / ${steps.length}`;
  }, [currentStep, steps]);

  const headerTitle = useMemo(() => {
    const vehicle = [task?.vehicle_make, task?.vehicle_model].filter(Boolean).join(' ');
    return vehicle || 'Parcours PPF';
  }, [task?.vehicle_make, task?.vehicle_model]);

  const headerSubtitle = useMemo(() => {
    const parts = [];
    if (task?.customer_name) parts.push(`Client : ${task.customer_name}`);
    if (task?.task_number) parts.push(`Tâche #${task.task_number}`);
    if (task?.ppf_zones?.length) parts.push(`${task.ppf_zones.length} zones`);
    return parts.join(' · ') || 'Intervention PPF';
  }, [task?.customer_name, task?.task_number, task?.ppf_zones]);

  const surfaceValue = useMemo(() => {
    if (intervention?.metadata && typeof intervention.metadata === 'object' && intervention.metadata !== null) {
      const meta = intervention.metadata as Record<string, unknown>;
      if (typeof meta.surface_m2 === 'number') {
        return `${meta.surface_m2.toFixed(1)} m²`;
      }
      if (typeof meta.surface === 'string') {
        return meta.surface;
      }
    }
    if (task?.ppf_zones?.length) {
      return `${task.ppf_zones.length} zones`;
    }
    return '—';
  }, [intervention?.metadata, task?.ppf_zones]);

  const surfaceLabel = useMemo(() => {
    if (intervention?.metadata && typeof intervention.metadata === 'object' && intervention.metadata !== null) {
      const meta = intervention.metadata as Record<string, unknown>;
      if (typeof meta.surface_label === 'string') {
        return meta.surface_label;
      }
    }
    return 'PPF';
  }, [intervention?.metadata]);

  const stepperSteps = useMemo(
    () =>
      steps.map((step) => ({
        id: step.id,
        label: PPF_STEP_CONFIG[step.id]?.label ?? step.title,
        duration: PPF_STEP_CONFIG[step.id]?.duration ?? '—',
        status: step.status,
      })),
    [steps]
  );

  const navigateWithDraftSave = useCallback(
    async (href: string) => {
      if (isNavigating) {
        return;
      }

      if (!draftGuard?.hasPendingDraft) {
        router.push(href);
        return;
      }

      setIsNavigating(true);
      try {
        await draftGuard.saveNow();
        router.push(href);
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'Impossible de sauvegarder le brouillon avant de changer de page.';
        toast.error(message);
      } finally {
        setIsNavigating(false);
      }
    },
    [draftGuard, isNavigating, router]
  );

  useEffect(() => {
    if (!stepId || isLoading || !intervention || !hasBackendSteps) return;
    if (!canAccessStep(stepId)) {
      const redirectStep = allowedStepId ?? steps[0]?.id;
      if (redirectStep) {
        router.replace(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(redirectStep)}`);
      } else {
        router.replace(`/tasks/${taskId}/workflow/ppf`);
      }
    }
  }, [allowedStepId, canAccessStep, hasBackendSteps, intervention, isLoading, router, stepId, steps, taskId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--rpma-bg))]">
        <LoadingState message="Chargement du workflow..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--rpma-bg))]">
        <ErrorState message={error.message} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--rpma-bg))]">
        <ErrorState message="Aucune intervention PPF active." onRetry={() => router.push(`/tasks/${taskId}`)} />
      </div>
    );
  }

  const currentIndex = stepId ? steps.findIndex((step) => step.id === stepId) : -1;
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const backHref = prevStep ? `/tasks/${taskId}/workflow/ppf/${getPPFStepPath(prevStep.id)}` : `/tasks/${taskId}/workflow/ppf`;
  const backLabel = prevStep ? `← Étape ${currentIndex}` : '← Retour';

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--rpma-bg))]">
      <PpfHeaderBand
        stepLabel={stepLabel}
        title={headerTitle}
        subtitle={headerSubtitle}
        temperature={intervention.temperature_celsius}
        humidity={intervention.humidity_percentage}
        surfaceValue={surfaceValue}
        surfaceLabel={surfaceLabel}
      />
      <PpfStepperBand
        steps={stepperSteps}
        currentStepId={currentStep?.id}
        canAccessStep={canAccessStep}
        onStepClick={(nextStepId) =>
          void navigateWithDraftSave(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(nextStepId)}`)
        }
      />
      <main className="flex-1 space-y-6 px-5 py-5">
        {children}
        {actionBar && (
          <div className="sticky bottom-0 z-40 mt-8 flex flex-col gap-3 border-t-2 border-[hsl(var(--rpma-border))] bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Button
                variant="ghost"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => void navigateWithDraftSave(backHref)}
                disabled={isNavigating}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Button>
              {actionBar.summary && <span>{actionBar.summary}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className={cn('h-9 text-xs font-semibold', actionBar.saveDisabled && 'opacity-50')}
                onClick={actionBar.onSaveDraft}
                disabled={actionBar.saveDisabled || isNavigating}
              >
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder le brouillon
              </Button>
              {actionBar.onDownloadData && (
                <Button
                  variant="outline"
                  className={cn('h-9 text-xs font-semibold', actionBar.downloadDisabled && 'opacity-50')}
                  onClick={actionBar.onDownloadData}
                  disabled={actionBar.downloadDisabled || isNavigating}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {actionBar.downloadLabel ?? 'Télécharger les données'}
                </Button>
              )}
              <Button
                className={cn(
                  'h-10 bg-emerald-600 text-xs font-semibold hover:bg-emerald-700',
                  actionBar.validateDisabled && 'opacity-50'
                )}
                onClick={actionBar.onValidate}
                disabled={actionBar.validateDisabled || isNavigating}
              >
                Valider {actionBar.validateLabel ?? 'étape'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
