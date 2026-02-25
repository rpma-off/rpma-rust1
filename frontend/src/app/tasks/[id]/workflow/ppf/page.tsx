'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { cn } from '@/lib/utils';
import type { StepType } from '@/lib/backend';
import {
  PPF_STEP_CONFIG,
  PpfWorkflowLayout,
  usePpfWorkflow,
  getPPFStepPath,
} from '@/domains/interventions';

export default function PPFWorkflowPage() {
  const router = useRouter();
  const { taskId, task, steps, currentStep, canAccessStep, intervention } = usePpfWorkflow();

  const orderedSteps = steps.length
    ? steps
    : (Object.keys(PPF_STEP_CONFIG) as StepType[]).map((stepId, index) => ({
        id: stepId,
        title: PPF_STEP_CONFIG[stepId].label,
        description: PPF_STEP_CONFIG[stepId].description,
        status: index === 0 ? 'in_progress' : 'pending',
        order: index + 1,
      }));

  const completedCount = orderedSteps.filter((step) => step.status === 'completed').length;
  const totalSteps = orderedSteps.length;

  const surfaceInfo = task?.ppf_zones?.length ? `${task.ppf_zones.length} zones` : '—';
  const scheduledDate = task?.scheduled_date
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(task.scheduled_date))
    : null;

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

      <div className="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-2xl text-white">
              🚗
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                {task?.priority && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                    Priorité {task.priority}
                  </span>
                )}
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">PPF Intégral</span>
                {scheduledDate && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                    Planifiée · {scheduledDate}
                  </span>
                )}
              </div>
              <div className="text-base font-extrabold text-foreground">
                {task?.vehicle_make ?? 'Véhicule'} {task?.vehicle_model ?? ''}{' '}
                {task?.vehicle_year ? `· ${task.vehicle_year}` : ''}
              </div>
              <div className="text-xs text-muted-foreground">
                Client : {task?.customer_name ?? '—'} · {task?.customer_phone ?? '—'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-emerald-600">{surfaceInfo}</div>
            <div className="text-xs text-muted-foreground">
              Surface totale · {task?.ppf_zones?.length ?? 0} zones
            </div>
            <div className="text-xs font-semibold text-emerald-600">
              {intervention?.status === 'completed' ? 'Intervention terminée' : 'Devis validé'}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Progression globale</span>
            <span>
              {completedCount} / {totalSteps} étapes
            </span>
          </div>
          <div className="flex gap-1">
            {orderedSteps.map((step) => {
              const isDone = step.status === 'completed';
              const isActive = step.id === currentStep?.id;
              return (
                <div
                  key={`pill-${step.id}`}
                  className={cn(
                    'h-1 flex-1 rounded-full',
                    isDone && 'bg-emerald-600',
                    isActive && 'bg-blue-500',
                    !isDone && !isActive && 'bg-[hsl(var(--rpma-border))]'
                  )}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap justify-between text-[10px] text-muted-foreground">
            {orderedSteps.map((step) => (
              <span key={`label-${step.id}`} className={step.id === currentStep?.id ? 'text-blue-600' : undefined}>
                {PPF_STEP_CONFIG[step.id]?.label ?? step.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        L&apos;intervention démarre à l&apos;Étape 1 — Inspection. Chaque étape doit être complétée dans l&apos;ordre. Les données sont sauvegardées automatiquement en local (offline-first).
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderedSteps.map((step) => {
          const config = PPF_STEP_CONFIG[step.id];
          const Icon = config.icon;
          const isDone = step.status === 'completed';
          const isActive = step.id === currentStep?.id;
          const isLocked = !canAccessStep(step.id) && !isDone && !isActive;

          const cardStyles = cn(
            'rounded-xl border bg-white p-4 shadow-sm transition',
            isActive && 'border-emerald-500 ring-1 ring-emerald-100',
            isLocked && 'opacity-55 cursor-not-allowed'
          );

          return (
            <div
              key={step.id}
              className={cardStyles}
              role="button"
              tabIndex={isLocked ? -1 : 0}
              onClick={() => {
                if (isLocked) return;
                router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(step.id)}`);
              }}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
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
                          ? 'bg-emerald-600'
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
            </div>
          );
        })}
      </div>
    </PpfWorkflowLayout>
  );
}
