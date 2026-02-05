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
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-[hsl(var(--rpma-teal))] text-foreground hover:bg-[hsl(var(--rpma-teal))]-hover hover:scale-105 focus:ring-2 focus:ring-[hsl(var(--rpma-teal))]/20'
          }
        `}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            CrÃ©ation en cours...
          </div>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 inline mr-2" />
            CrÃ©er la tÃ¢che
          </>
        )}
      </button>
    </div>
   );
});

TaskFormSubmit.displayName = 'TaskFormSubmit';
