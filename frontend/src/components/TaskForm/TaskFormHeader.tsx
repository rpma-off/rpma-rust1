import React from 'react';

interface TaskFormHeaderProps {
  isEditing: boolean;
  taskNumber: string;
  showHeader: boolean;
}

export const TaskFormHeader: React.FC<TaskFormHeaderProps> = React.memo(({
  isEditing,
  taskNumber,
  showHeader
}) => {
  if (!showHeader) return null;

  return (
    <div className="bg-gradient-to-r from-black to-zinc-900 text-white p-4 sm:p-6 rounded-t-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-bold">
            {isEditing ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}
          </h2>
          <p className="text-border-light mt-1 text-sm sm:text-base">
            {isEditing ? 'Modifiez les informations de la tâche' : 'Remplissez le formulaire pour créer une nouvelle tâche'}
          </p>
        </div>
        <div className="text-center sm:text-right">
          <div className="text-2xl sm:text-3xl font-bold">{taskNumber}</div>
          <div className="text-border-light text-xs sm:text-sm">Numéro de tâche</div>
        </div>
      </div>
    </div>
   );
});

TaskFormHeader.displayName = 'TaskFormHeader';