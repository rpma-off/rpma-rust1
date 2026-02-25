'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { StepType } from '@/lib/backend';

type StepItem = {
  id: StepType;
  label: string;
  duration: string;
  status: 'completed' | 'in_progress' | 'pending';
};

type PpfStepperBandProps = {
  steps: StepItem[];
  currentStepId?: StepType | null;
  canAccessStep: (stepId: StepType) => boolean;
  onStepClick: (stepId: StepType) => void;
};

export function PpfStepperBand({
  steps,
  currentStepId,
  canAccessStep,
  onStepClick,
}: PpfStepperBandProps) {
  return (
    <div className="bg-white border-b border-[hsl(var(--rpma-border))] px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        {steps.map((step, index) => {
          const isDone = step.status === 'completed';
          const isActive = step.id === currentStepId;
          const isLocked = !isDone && !isActive && !canAccessStep(step.id);
          const circleClasses = cn(
            'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
            isDone && 'border-emerald-600 bg-emerald-600 text-white',
            isActive && 'border-emerald-600 bg-white text-emerald-600 shadow-[0_0_0_4px_rgba(13,148,136,0.15)]',
            isLocked && 'border-[hsl(var(--rpma-border))] text-muted-foreground'
          );
          const lineClasses = cn(
            'h-0.5 flex-1 rounded-full',
            isDone && 'bg-emerald-600',
            isActive && 'bg-gradient-to-r from-emerald-600 to-[hsl(var(--rpma-border))]',
            isLocked && 'bg-[hsl(var(--rpma-border))]'
          );

          return (
            <React.Fragment key={step.id}>
              <div className="flex min-w-[160px] flex-1 items-center gap-3">
                <button
                  type="button"
                  className={circleClasses}
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    onStepClick(step.id);
                  }}
                >
                  {index + 1}
                </button>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">{step.label}</div>
                  <div className="text-[10px] text-muted-foreground">{step.duration}</div>
                </div>
              </div>
              {index < steps.length - 1 && <div className={lineClasses} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
