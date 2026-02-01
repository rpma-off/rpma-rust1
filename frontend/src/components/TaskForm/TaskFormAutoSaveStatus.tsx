import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';

interface TaskFormAutoSaveStatusProps {
  autoSaveEnabled: boolean;
  isDirty: boolean;
}

export const TaskFormAutoSaveStatus: React.FC<TaskFormAutoSaveStatusProps> = React.memo(({
  autoSaveEnabled,
  isDirty
}) => {
  if (!autoSaveEnabled) return null;

  return (
    <div className="mt-4 text-center text-xs sm:text-sm text-border-light">
      {isDirty ? (
        <div className="flex items-center justify-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>Modifications non sauvegardées</span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <CheckCircle className="w-4 h-4 text-accent" />
          <span>Toutes les modifications sont sauvegardées</span>
        </div>
      )}
    </div>
   );
});

TaskFormAutoSaveStatus.displayName = 'TaskFormAutoSaveStatus';