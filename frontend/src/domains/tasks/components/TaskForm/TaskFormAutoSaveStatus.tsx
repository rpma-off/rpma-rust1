import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';

interface TaskFormAutoSaveStatusProps {
  autoSaveEnabled: boolean;
  isDirty: boolean;
  lastSaved?: Date | null;
}

export const TaskFormAutoSaveStatus: React.FC<TaskFormAutoSaveStatusProps> = React.memo(({
  autoSaveEnabled,
  isDirty,
  lastSaved
}) => {
  if (!autoSaveEnabled) return null;

  const lastSavedLabel = lastSaved
    ? `Dernière sauvegarde à ${lastSaved.toLocaleTimeString()}`
    : 'Aucune sauvegarde';

  return (
    <div className="mt-4 text-center text-xs sm:text-sm text-muted-foreground">
      {isDirty ? (
        <div className="flex items-center justify-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>Modifications non sauvegardées</span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <CheckCircle className="w-4 h-4 text-[hsl(var(--rpma-teal))]" />
          <span>Toutes les modifications sont sauvegardées</span>
        </div>
      )}
      {!isDirty && (
        <div className="mt-1 text-xs text-muted-foreground/80">
          {lastSavedLabel}
        </div>
      )}
    </div>
   );
});

TaskFormAutoSaveStatus.displayName = 'TaskFormAutoSaveStatus';
