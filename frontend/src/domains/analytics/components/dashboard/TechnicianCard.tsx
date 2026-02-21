import React from 'react';

interface TechnicianCardProps {
  name: string;
  initials: string;
  completedTasks: number;
  inProgressTasks: number;
  onClick: () => void;
}

export const TechnicianCard = React.memo(function TechnicianCard({
  name,
  initials,
  completedTasks,
  inProgressTasks,
  onClick
}: TechnicianCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-zinc-800 rounded-lg border border-zinc-700 p-5 text-left transition-all duration-300 hover:bg-zinc-700/50"
    >
      <div className="flex items-center mb-4">
        <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center text-sm font-medium text-white mr-3">
          {initials}
        </div>
        <div>
          <h3 className="font-semibold text-lg">{name}</h3>
          <p className="text-xs text-zinc-400">Technicien</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-900 rounded p-2">
          <p className="text-xs text-zinc-400">Complétées</p>
          <p className="text-lg font-semibold text-green-400">{completedTasks}</p>
        </div>
        <div className="bg-zinc-900 rounded p-2">
          <p className="text-xs text-zinc-400">En cours</p>
          <p className="text-lg font-semibold text-yellow-400">{inProgressTasks}</p>
        </div>
      </div>
    </button>
  );
});