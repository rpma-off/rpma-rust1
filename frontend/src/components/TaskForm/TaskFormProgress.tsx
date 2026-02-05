import React, { useCallback, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { FormStep, ENHANCED_STEPS as STEPS_CONFIG } from './types';

interface TaskFormProgressProps {
  currentStep: FormStep;
  canProceedToNextStep: (step: FormStep) => boolean;
  onStepClick: (stepId: FormStep) => void;
}

export const TaskFormProgress: React.FC<TaskFormProgressProps> = React.memo(({
  currentStep,
  canProceedToNextStep,
  onStepClick
}) => {
  // Memoized progress calculation
  const progress = useMemo(() => {
    const currentIndex = STEPS_CONFIG.findIndex(s => s.id === currentStep);
    return ((currentIndex + 1) / STEPS_CONFIG.length) * 100;
  }, [currentStep]);

  // Memoized progress bar
  const renderProgressBar = useCallback(() => (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
        <span className="text-xs sm:text-sm font-medium text-foreground">
          Ã‰tape {STEPS_CONFIG.findIndex(s => s.id === currentStep) + 1} sur {STEPS_CONFIG.length}
        </span>
        <span className="text-xs sm:text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-[hsl(var(--rpma-teal))] h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  ), [currentStep, progress]);

  // Memoized step indicators
  const renderStepIndicators = useCallback(() => (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
      {STEPS_CONFIG.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = STEPS_CONFIG.findIndex(s => s.id === currentStep) > index;
        const canNavigate = canProceedToNextStep(step.id);

        return (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            disabled={!canNavigate}
            className={`
              flex items-center space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm
              ${isActive
                ? 'bg-[hsl(var(--rpma-teal))]/20 text-[hsl(var(--rpma-teal))] border-2 border-[hsl(var(--rpma-teal))]/30'
                : isCompleted
                  ? 'bg-[hsl(var(--rpma-teal))]/30 text-[hsl(var(--rpma-teal))] border-2 border-[hsl(var(--rpma-teal))]'
                  : canNavigate
                    ? 'bg-muted text-foreground border-2 border-border hover:bg-border hover:scale-105'
                    : 'bg-[hsl(var(--rpma-surface))] text-muted-foreground border-2 border-border/30 cursor-not-allowed'
              }
            `}
          >
            <div className={`
              w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
              ${isActive
                ? 'bg-[hsl(var(--rpma-teal))] text-foreground'
                : isCompleted
                  ? 'bg-[hsl(var(--rpma-teal))] text-foreground'
                  : 'bg-border text-foreground'
              }
            `}>
              {isCompleted ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : index + 1}
            </div>
            <span className="hidden xs:inline">{step.label}</span>
          </button>
        );
      })}
    </div>
  ), [currentStep, canProceedToNextStep, onStepClick]);

  return (
    <>
      {renderProgressBar()}
      {renderStepIndicators()}
    </>
   );
});

TaskFormProgress.displayName = 'TaskFormProgress';
