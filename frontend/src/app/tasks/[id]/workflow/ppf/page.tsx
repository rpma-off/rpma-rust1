'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepType } from '@/lib/backend';
import { Button } from '@/components/ui/button';
import {
  PPF_STEP_CONFIG,
  PpfWorkflowLayout,
  getPPFStepPath,
  usePpfWorkflow,
} from '@/domains/interventions';

export default function PPFWorkflowPage() {
  const router = useRouter();
  const { taskId, task, steps, currentStep, canAccessStep } = usePpfWorkflow();

  const orderedSteps = steps.length
    ? steps
    : (Object.keys(PPF_STEP_CONFIG) as StepType[]).map((stepId, index) => ({
        id: stepId,
        title: PPF_STEP_CONFIG[stepId].label,
        description: PPF_STEP_CONFIG[stepId].description,
        status: index === 0 ? 'in_progress' : 'pending',
        order: index + 1,
      }));

  const getLockReason = (stepIndex: number) => {
    const previousStep = orderedSteps[stepIndex - 1];
    if (previousStep && previousStep.status !== 'completed') {
      const previousLabel = PPF_STEP_CONFIG[previousStep.id]?.label ?? previousStep.title;
      return `Complétez d'abord « ${previousLabel} » pour déverrouiller cette étape.`;
    }
    return 'Étape verrouillée tant que les étapes précédentes ne sont pas validées.';
  };

  return (
    <PpfWorkflowLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xl font-extrabold text-foreground">
            🛡 Workflow PPF — {task?.vehicle_make ?? ''} {task?.vehicle_model ?? ''}
          </div>
          <div className="text-sm text-muted-foreground">
            Sélectionnez une étape pour commencer ou reprendre l&apos;intervention
          </div>
        </div>
        <div className="rounded-full bg-[hsl(var(--rpma-surface))] px-3 py-1 text-xs text-muted-foreground shadow-sm">
          Sauvegarde auto activée
        </div>
      </div>

      <div className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-xs text-info">
        L&apos;intervention démarre à l&apos;Étape 1 — Inspection. Chaque étape doit être complétée dans l&apos;ordre. Les données sont sauvegardées automatiquement en local (offline-first).
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderedSteps.map((step, stepIndex) => {
          const config = PPF_STEP_CONFIG[step.id];
          const Icon = config.icon;
          const isDone = step.status === 'completed';
          const isActive = step.id === currentStep?.id;
          const isLocked = !canAccessStep(step.id) && !isDone && !isActive;
          const lockReason = isLocked ? getLockReason(stepIndex) : null;

          const cardStyles = cn(
            'rounded-xl border bg-white p-4 shadow-sm transition',
            isActive && 'border-success ring-1 ring-success/20',
            isLocked && 'opacity-55 cursor-not-allowed'
          );

          return (
            <div
              key={step.id}
              className={cardStyles}
              role="button"
              aria-disabled={isLocked}
              tabIndex={isLocked ? -1 : 0}
              onClick={() => {
                if (isLocked) return;
                router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(step.id)}`);
              }}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-info/10 text-xl text-info">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-extrabold text-foreground">{config.label}</div>
              <div className="mt-2 text-xs text-muted-foreground">{config.description}</div>
              <div className="my-3 h-px bg-[hsl(var(--rpma-border))]" />
              <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {config.duration}
              </div>
              <div className="mb-3 flex gap-1">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`mini-${step.id}-${index}`}
                    className={cn(
                      'h-1 flex-1 rounded-full',
                      isDone || isActive
                        ? index < 2
                          ? 'bg-success'
                          : 'bg-[hsl(var(--rpma-border))]'
                        : 'bg-[hsl(var(--rpma-border))]'
                    )}
                  />
                ))}
              </div>
              <Button className="w-full" variant={isActive ? 'default' : 'outline'} disabled={isLocked}>
                {isLocked ? 'Verrouillé' : isDone ? 'Consulter' : 'Commencer'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {lockReason && (
                <p className="mt-2 text-[11px] font-medium text-warning">{lockReason}</p>
              )}
            </div>
          );
        })}
      </div>
    </PpfWorkflowLayout>
  );
}
