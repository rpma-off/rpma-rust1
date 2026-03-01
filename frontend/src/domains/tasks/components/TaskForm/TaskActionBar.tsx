import React from 'react';
import { ArrowLeft, ArrowRight, Save, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormStep } from './types';
import { ENHANCED_STEPS } from './types';

interface TaskActionBarProps {
  currentStep: FormStep;
  canProceedToNextStep: (step: FormStep) => boolean;
  onNextStep: () => void;
  onPreviousStep: () => void;
  autoSaveEnabled: boolean;
  onAutoSaveToggle: (enabled: boolean) => void;
  isDirty: boolean;
  onAutoSave: () => void;
  loading: boolean;
  onSubmit?: (e: React.FormEvent) => void;
}

export const TaskActionBar: React.FC<TaskActionBarProps> = React.memo(({
  currentStep,
  canProceedToNextStep,
  onNextStep,
  onPreviousStep,
  autoSaveEnabled,
  onAutoSaveToggle,
  isDirty,
  onAutoSave,
  loading,
  onSubmit
}) => {
  const currentIndex = ENHANCED_STEPS.findIndex(s => s.id === currentStep);
  const prevStep = currentIndex > 0 ? ENHANCED_STEPS[currentIndex - 1] : null;
  const isLastStep = currentIndex === ENHANCED_STEPS.length - 1;

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLastStep && onSubmit) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    } else {
      onNextStep();
    }
  };

  return (
    <div className="sticky bottom-0 z-40 mt-8 flex flex-col gap-3 border-t-2 border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={onPreviousStep}
          disabled={currentIndex === 0}
          className={cn(
            'flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-all duration-200',
            currentIndex === 0
              ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          {prevStep ? `Étape ${currentIndex} : ${prevStep.label}` : 'Retour'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={(e) => onAutoSaveToggle(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
          />
          <span>Auto-sauvegarde</span>
        </label>

        {isDirty && (
          <button
            type="button"
            onClick={onAutoSave}
            disabled={loading}
            className={cn(
              'flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-all duration-200',
              'border border-slate-200 bg-white text-slate-600',
              'hover:bg-slate-50 hover:border-slate-300',
              loading && 'opacity-50 cursor-wait'
            )}
          >
            <Save className="h-4 w-4" />
            Sauvegarder brouillon
          </button>
        )}

        <button
          type="button"
          onClick={handleButtonClick}
          disabled={!canProceedToNextStep(currentStep)}
          className={cn(
            'flex h-10 items-center gap-2 rounded-lg px-6 text-xs font-semibold transition-all duration-200',
            'bg-emerald-600 text-white',
            'hover:bg-emerald-700',
            !canProceedToNextStep(currentStep) && 'bg-slate-300 text-slate-500 cursor-not-allowed',
            loading && 'opacity-50 cursor-wait'
          )}
        >
          {isLastStep ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Créer la tâche
            </>
          ) : (
            <>
              Valider l&apos;étape
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
});

TaskActionBar.displayName = 'TaskActionBar';
