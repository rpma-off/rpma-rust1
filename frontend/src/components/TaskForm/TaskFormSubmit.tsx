import React from 'react';
import { CheckCircle } from 'lucide-react';
import { FormStep } from './types';

interface TaskFormSubmitProps {
  currentStep: FormStep;
  loading: boolean;
  canProceedToNextStep: (step: FormStep) => boolean;
}

export const TaskFormSubmit: React.FC<TaskFormSubmitProps> = React.memo(({
  currentStep,
  loading,
  canProceedToNextStep
}) => {
  if (currentStep !== 'schedule') return null;

  return (
    <div className="pt-6 border-t border-border">
      <button
        type="submit"
        disabled={loading || !canProceedToNextStep(currentStep)}
        className={`
          w-full px-4 sm:px-6 py-3 text-base sm:text-lg font-medium rounded-lg transition-all duration-200
          ${loading || !canProceedToNextStep(currentStep)
            ? 'bg-muted text-border-light cursor-not-allowed'
            : 'bg-accent text-foreground hover:bg-accent-hover hover:scale-105 focus:ring-2 focus:ring-accent'
          }
        `}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Création en cours...
          </div>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 inline mr-2" />
            Créer la tâche
          </>
        )}
      </button>
    </div>
   );
});

TaskFormSubmit.displayName = 'TaskFormSubmit';