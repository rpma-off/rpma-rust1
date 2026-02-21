import React from 'react';
import { Car, UserCircle, Calendar } from 'lucide-react';
import { DashboardTask } from './types';
import { getDashboardTaskDisplayTitle, getTaskDisplayStatus } from '@/lib/utils/task-display';
import { TaskStatus } from '@/lib/backend';

interface TaskCardProps {
  task: DashboardTask;
  onClick: () => void;
}

export const TaskCard = React.memo(function TaskCard({
  task,
  onClick
}: TaskCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900/20 text-green-400 border-green-800/30';
      case 'in_progress':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-800/30';
      case 'scheduled':
        return 'bg-blue-900/20 text-blue-400 border-blue-800/30';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getStatusText = (status: string) => {
    return getTaskDisplayStatus(status as TaskStatus);
  };

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 cursor-pointer transition-all duration-300 hover:bg-zinc-800/50 hover:border-zinc-700"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg truncate pr-2" title={getDashboardTaskDisplayTitle(task)}>
          {getDashboardTaskDisplayTitle(task)}
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}>
          {getStatusText(task.status)}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center text-zinc-400">
          <Car className="h-4 w-4 mr-2" />
          <span className="text-sm truncate">{task.vehicle} {task.vehicle_model}</span>
        </div>
        {task.zones.length > 0 && (
          <div className="flex items-center text-zinc-400">
            <div className="h-4 w-4 mr-2 flex items-center justify-center">
              <span className="text-xs">PPF</span>
            </div>
            <span className="text-sm truncate">{task.zones.join(', ')}</span>
          </div>
        )}
        {task.technician && (
          <div className="flex items-center text-zinc-400">
            <UserCircle className="h-4 w-4 mr-2" />
            <span className="text-sm truncate">{task.technician.name}</span>
          </div>
        )}
        {task.scheduledDate && (
          <div className="flex items-center text-zinc-400">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="text-sm">{new Date(task.scheduledDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Checklist Progress */}
      {task.checklistItems.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Progression</span>
            <span>
              {task.checklistItems.filter(item => item.completed).length}/{task.checklistItems.length}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full"
              style={{
                width: `${(task.checklistItems.filter(item => item.completed).length / task.checklistItems.length) * 100}%`
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
});