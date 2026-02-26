'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock } from 'lucide-react';

type StepItem = {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending';
  count?: number;
};

type TaskStepperBandProps = {
  steps: StepItem[];
  totalProgress: number;
  onStepClick?: (stepId: string) => void;
  className?: string;
};

export function TaskStepperBand({
  steps,
  totalProgress,
  onStepClick,
  className,
}: TaskStepperBandProps) {
  const completedCount = steps.filter((step) => step.status === 'completed').length;

  return (
    <div className={cn('bg-white border-b border-[hsl(var(--rpma-border))] px-5 py-4 shadow-sm', className)}>
      <div className="flex flex-col gap-4">
        {/* Overall Progress Pills */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold">Progression globale</span>
          <span className="font-medium">{totalProgress}%</span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((step, _index) => {
            const isDone = step.status === 'completed';
            const isActive = step.status === 'in_progress';

            return (
              <div
                key={`pill-${step.id}`}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  isDone && 'bg-emerald-600',
                  isActive && 'bg-blue-500',
                  !isDone && !isActive && 'bg-[hsl(var(--rpma-border))]'
                )}
              />
            );
          })}
        </div>

        {/* Step Indicators */}
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-0">
          {steps.map((step, stepIndex) => {
            const isDone = step.status === 'completed';
            const isActive = step.status === 'in_progress';
            const isPending = step.status === 'pending';
            const stepNumber = stepIndex + 1;

            return (
              <React.Fragment key={step.id}>
                <div
                  className={cn(
                    'flex min-w-[140px] flex-1 items-center gap-3 cursor-pointer group',
                    onStepClick ? '' : 'pointer-events-none'
                  )}
                  onClick={() => onStepClick?.(step.id)}
                >
                  <div
                    className={cn(
                      'relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200',
                      isDone && 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
                      isActive && 'border-blue-600 bg-white text-blue-600 shadow-md shadow-blue-500/20',
                      isPending && 'border-[hsl(var(--rpma-border))] bg-white text-muted-foreground',
                      'group-hover:scale-105 group-hover:shadow-lg'
                    )}
                  >
                    {isDone && <CheckCircle2 className="h-5 w-5" />}
                    {isActive && <Clock className="h-5 w-5 animate-pulse" />}
                    {isPending && <span className="text-xs">{stepNumber}</span>}

                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        'text-xs font-semibold transition-colors',
                        isDone && 'text-emerald-600',
                        isActive && 'text-blue-600',
                        isPending && 'text-foreground group-hover:text-foreground/80'
                      )}
                    >
                      {step.label}
                    </div>
                    <div
                      className={cn(
                        'text-[10px] transition-colors',
                        isDone && 'text-emerald-600/70',
                        isActive && 'text-blue-600/70',
                        isPending && 'text-muted-foreground'
                      )}
                    >
                      {isDone && 'Terminé'}
                      {isActive && 'En cours'}
                      {isPending && 'En attente'}
                      {step.count !== undefined && step.count > 0 && ` (${step.count})`}
                    </div>
                  </div>
                </div>

                {stepIndex < steps.length - 1 && (
                  <div
                    className={cn(
                      'hidden lg:block h-0.5 flex-1 mx-1 rounded-full transition-all duration-300',
                      isDone && steps[stepIndex + 1].status === 'completed' && 'bg-emerald-600',
                      isDone && steps[stepIndex + 1].status !== 'completed' && 'bg-gradient-to-r from-emerald-600 to-[hsl(var(--rpma-border))]',
                      !isDone && steps[stepIndex + 1].status === 'in_progress' && 'bg-gradient-to-r from-[hsl(var(--rpma-border))] to-blue-500',
                      !isDone && steps[stepIndex + 1].status === 'pending' && 'bg-[hsl(var(--rpma-border))]'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Summary */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium">
            {completedCount} / {steps.length} étapes complétées
          </span>
        </div>
      </div>
    </div>
  );
}
