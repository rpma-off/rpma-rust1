import React from 'react';
import { Save } from 'lucide-react';
import { FormStep } from './types';

interface TaskFormNavigationProps {
  currentStep: FormStep;
  canProceedToNextStep: (step: FormStep) => boolean;
  onNextStep: () => void;
  onPreviousStep: () => void;
  autoSaveEnabled: boolean;
  onAutoSaveToggle: (enabled: boolean) => void;
  isDirty: boolean;
  onAutoSave: () => void;
  loading: boolean;
}

export const TaskFormNavigation: React.FC<TaskFormNavigationProps> = React.memo(({
  currentStep,
  canProceedToNextStep,
  onNextStep,
  onPreviousStep,
  autoSaveEnabled,
  onAutoSaveToggle,
  isDirty,
  onAutoSave,
  loading
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-[hsl(var(--rpma-border))] space-y-4 sm:space-y-0">
      <button
        type="button"
        onClick={onPreviousStep}
        disabled={currentStep === 'vehicle'}
        className={`
          w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
          ${currentStep === 'vehicle'
            ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
            : 'bg-muted text-foreground hover:bg-border hover:scale-105 focus:ring-2 focus:ring-[hsl(var(--rpma-teal))]/20'
          }
        `}
      >
        PrÃ©cÃ©dent
      </button>

      <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
        {/* Auto-save toggle */}
        <label className="flex items-center space-x-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={(e) => onAutoSaveToggle(e.target.checked)}
            className="rounded border-[hsl(var(--rpma-border))] text-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20"
          />
          <span className="text-xs sm:text-sm">Auto-sauvegarde</span>
        </label>

        {/* Save button */}
        {isDirty && (
          <button
            type="button"
            onClick={onAutoSave}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-[hsl(var(--rpma-teal))] bg-[hsl(var(--rpma-teal))]/20 rounded-lg hover:bg-[hsl(var(--rpma-teal))]/30 hover:scale-105 focus:ring-2 focus:ring-[hsl(var(--rpma-teal))]/20 transition-all duration-200"
          >
            <Save className="w-4 h-4 inline mr-1" />
            Sauvegarder
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onNextStep}
        disabled={!canProceedToNextStep(currentStep)}
        className={`
          w-full sm:w-auto px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200
          ${canProceedToNextStep(currentStep)
            ? 'bg-[hsl(var(--rpma-teal))] text-foreground hover:bg-[hsl(var(--rpma-teal))]-hover hover:scale-105 focus:ring-2 focus:ring-[hsl(var(--rpma-teal))]/20'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
          }
        `}
      >
        {currentStep === 'schedule' ? 'Terminer' : 'Suivant'}
      </button>
    </div>
   );
});

TaskFormNavigation.displayName = 'TaskFormNavigation';
