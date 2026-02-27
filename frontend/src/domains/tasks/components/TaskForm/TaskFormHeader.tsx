import React from 'react';
import { Zap, Calendar, Target } from 'lucide-react';

interface TaskFormHeaderProps {
  isEditing: boolean;
  taskNumber: string;
  showHeader: boolean;
  currentStepLabel?: string;
  stepsCount?: number;
  currentStepIndex?: number;
}

export const TaskFormHeader: React.FC<TaskFormHeaderProps> = React.memo(({
  isEditing,
  taskNumber,
  showHeader,
  currentStepLabel = 'Étape 1',
  stepsCount = 4,
  currentStepIndex = 0
}) => {
  if (!showHeader) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white">
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              {currentStepLabel}
            </div>
            <div>
              <div className="text-base font-extrabold">
                {isEditing ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}
              </div>
              <div className="text-xs text-white/70">
                {isEditing ? 'Modifiez les informations de la tâche' : 'Remplissez le formulaire pour créer une nouvelle tâche'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 text-right">
            <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base font-extrabold text-emerald-100">{taskNumber}</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Tâche</span>
              </div>
              <div className="h-7 w-px bg-white/20" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base font-extrabold text-emerald-100">~20 min</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Durée estimée</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TaskFormHeader.displayName = 'TaskFormHeader';
