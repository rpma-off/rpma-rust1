import React, { memo } from 'react';
import { Clock, Wrench } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { TaskWithDetails } from '@/types/task.types';

interface TaskHeaderProps {
  task: TaskWithDetails;
  statusInfo: {
    label: string;
    color: string;
  };
  isAssignedToCurrentUser: boolean;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  statusInfo,
  isAssignedToCurrentUser,
}) => {
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-gradient-to-r from-muted to-background">
      <div className="flex flex-col space-y-2 sm:space-y-0">
        {/* Title and Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground break-words pr-2 leading-tight">
              {task.title}
            </h2>
          </div>
          <div className="flex-shrink-0
            ">
            <span 
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.color} shadow-sm`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {task.assigned_at && (
            <div className="flex items-center text-border-light bg-border px-2 py-1 rounded-md">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-border flex-shrink-0" />
              <span className="text-xs sm:text-sm">
                Assigné le {formatDate(task.assigned_at as unknown as string, 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
          )}

          {task.technician_id && (
            <div
              className={`flex items-center px-2.5 py-1 rounded-full border ${
                isAssignedToCurrentUser
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-border border-border text-border-light'
              }`}
            >
              <Wrench className={`h-3.5 w-3.5 mr-1.5 ${
                isAssignedToCurrentUser ? 'text-accent' : 'text-border'
              } flex-shrink-0`} />
              <span className="text-xs sm:text-sm whitespace-nowrap">
                {isAssignedToCurrentUser ? 'Vous êtes assigné' : 'Assigné à un technicien'}
              </span>
            </div>
          )}

          {/* Add any additional metadata here */}
          {task.workflow_status && (
            <div className="hidden sm:flex items-center text-border-light bg-border px-2 py-1 rounded-md">
              <span className="text-xs sm:text-sm capitalize">
                {task.workflow_status.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(TaskHeader);