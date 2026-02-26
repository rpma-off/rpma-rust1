'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { ErrorState } from '@/shared/ui/layout/ErrorState';
import type { StepType } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { getPPFStepPath } from '../../utils/ppf-workflow';
import { usePpfWorkflow } from '../../hooks/usePpfWorkflow';
import { PpfHeaderBand } from './PpfHeaderBand';
import { PpfStepperBand } from './PpfStepperBand';
import { PPF_STEP_CONFIG } from './ppfWorkflow.config';

type ActionBarConfig = {
  summary?: string;
  onSaveDraft?: () => void;
  onValidate?: () => void;
  validateLabel?: string;
  saveDisabled?: boolean;
  validateDisabled?: boolean;
  isSaving?: boolean;
  isValidating?: boolean;
};

type PpfWorkflowLayoutProps = {
  stepId?: StepType;
  actionBar?: ActionBarConfig;
  children: React.ReactNode;
};

export function PpfWorkflowLayout({ stepId, actionBar, children }: PpfWorkflowLayoutProps) {
  const router = useRouter();
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
    if (!currentStep) return 'Workflow complété';
    const index = steps.findIndex((step) => step.id === currentStep.id);
    if (index < 0) return 'Workflow PPF';
    return `Étape ${index + 1} / ${steps.length}`;
  }, [currentStep, steps]);

  const headerTitle = useMemo(() => {
    const vehicle = [task?.vehicle_make, task?.vehicle_model].filter(Boolean).join(' ');
    return vehicle || 'Workflow PPF';
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

  useEffect(() => {
    // Do not redirect while workflow steps are still hydrating; the fallback default steps
    // would otherwise send the user back to step 1 on transient remounts/reloads.
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
      <div className="min-h-screen bg-[hsl(var(--rpma-bg))] flex items-center justify-center">
        <LoadingState message="Chargement du workflow..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[hsl(var(--rpma-bg))] flex items-center justify-center">
        <ErrorState message={error.message} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="min-h-screen bg-[hsl(var(--rpma-bg))] flex items-center justify-center">
        <ErrorState message="Aucune intervention PPF active." onRetry={() => router.push(`/tasks/${taskId}`)} />
      </div>
    );
  }

  const currentIndex = stepId ? steps.findIndex((step) => step.id === stepId) : -1;
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const backHref = prevStep ? `/tasks/${taskId}/workflow/ppf/${getPPFStepPath(prevStep.id)}` : `/tasks/${taskId}/workflow/ppf`;
  const backLabel = prevStep ? `← Étape ${currentIndex}` : '← Retour';

  return (
    <div className="min-h-screen bg-[hsl(var(--rpma-bg))] flex flex-col">
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
          router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(nextStepId)}`)
        }
      />
      <main className="flex-1 px-5 py-5 space-y-6">
        {children}
        {actionBar && (
          <div className="sticky bottom-0 z-40 mt-8 flex flex-col gap-3 border-t-2 border-[hsl(var(--rpma-border))] bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Button
                variant="ghost"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => router.push(backHref)}
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
                disabled={actionBar.saveDisabled}
              >
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder brouillon
              </Button>
              <Button
                className={cn(
                  'h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700',
                  actionBar.validateDisabled && 'opacity-50'
                )}
                onClick={actionBar.onValidate}
                disabled={actionBar.validateDisabled}
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
