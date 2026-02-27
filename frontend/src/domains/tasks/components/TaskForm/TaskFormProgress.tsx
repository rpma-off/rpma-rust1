import React, { useCallback, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormStep, ENHANCED_STEPS as STEPS_CONFIG } from './types';

interface TaskFormProgressProps {
  currentStep: FormStep;
  canProceedToNextStep: (step: FormStep) => boolean;
  onStepClick: (stepId: FormStep) => void;
  completedSteps?: Set<FormStep>;
}

export const TaskFormProgress: React.FC<TaskFormProgressProps> = React.memo(({
  currentStep,
  canProceedToNextStep,
  onStepClick,
  completedSteps = new Set()
}) => {
  const stepItems = useMemo(
    () =>
      STEPS_CONFIG.map((step, index) => ({
        id: step.id,
        label: step.label,
        description: step.description,
        status: completedSteps.has(step.id) ? 'completed' : (step.id === currentStep ? 'in_progress' : 'pending'),
      })),
    [completedSteps, currentStep]
  );

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        {stepItems.map((step, index) => {
          const isDone = step.status === 'completed';
          const isActive = step.id === currentStep;
          const isLocked = !isDone && !isActive && !canProceedToNextStep(step.id);

          const circleClasses = cn(
            'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
            isDone && 'border-emerald-600 bg-emerald-600 text-white',
            isActive && 'border-emerald-600 bg-white text-emerald-600 shadow-[0_0_0_4px_rgba(13,148,136,0.15)]',
            isLocked && 'border-slate-300 text-slate-400'
          );
          const lineClasses = cn(
            'h-0.5 flex-1 rounded-full',
            isDone && 'bg-emerald-600',
            isActive && 'bg-gradient-to-r from-emerald-600 to-slate-200',
            isLocked && 'bg-slate-200'
          );

          return (
            <React.Fragment key={step.id}>
              <div className="flex min-w-[140px] flex-1 items-center gap-3">
                <button
                  type="button"
                  className={circleClasses}
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    onStepClick(step.id);
                  }}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </button>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">{step.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{step.description}</div>
                </div>
              </div>
              {index < stepItems.length - 1 && <div className={lineClasses} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

TaskFormProgress.displayName = 'TaskFormProgress';
