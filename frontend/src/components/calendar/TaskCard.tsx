import React, { memo } from 'react';
import type { CalendarTask } from '../../lib/backend';

interface TaskCardProps {
  task: CalendarTask;
  mode?: 'compact' | 'full';
  className?: string;
  onClick?: () => void;
  isDragging?: boolean;
}

export type CalendarTaskWithCustomerName = CalendarTask & { customer_name?: string | null };

export const getCalendarTaskLabel = (task: CalendarTaskWithCustomerName): string => {
  const plateValue = task.vehicle_plate?.trim();
  const clientValue = task.client_name?.trim() || task.customer_name?.trim();
  const plate = plateValue ? plateValue : 'N/A';
  const clientName = clientValue ? clientValue : 'N/A';
  return `${plate} – ${clientName}`;
};

const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();

  switch (statusLower) {
    case 'draft':
      return '#6B7280';
    case 'scheduled':
      return '#3B82F6';
    case 'in_progress':
      return '#F59E0B';
    case 'completed':
      return '#10B981';
    case 'cancelled':
      return '#EF4444';
    case 'on_hold':
    case 'paused':
      return '#8B5CF6';
    case 'pending':
      return '#F97316';
    case 'invalid':
    case 'failed':
    case 'archived':
    case 'overdue':
      return '#DC2626';
    case 'assigned':
      return '#14B8A6';
    default:
      return '#9CA3AF';
  }
};

const getPriorityColor = (priority: string): string => {
  const priorityLower = priority.toLowerCase();

  switch (priorityLower) {
    case 'urgent':
      return '#EF4444';
    case 'high':
      return '#F97316';
    case 'medium':
      return '#F59E0B';
    case 'low':
      return '#3B82F6';
    default:
      return '#6B7280';
  }
};

const TaskCardComponent = memo<TaskCardProps>(({
  task,
  mode = 'compact',
  className = '',
  onClick,
  isDragging = false,
}) => {
  const statusColors = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const taskLabel = getCalendarTaskLabel(task);
  const titleSegment = task.title?.trim() ? `, Title: ${task.title.trim()}` : '';
  const ariaLabel = `${taskLabel}${titleSegment}, Status: ${task.status}, Priority: ${task.priority}`;

  const timeDisplay = task.start_time && task.end_time
    ? `${task.start_time} - ${task.end_time}`
    : task.start_time || 'TBD';

  if (mode === 'compact') {
    return (
      <div
        className={`
          px-2 py-1 rounded-full bg-[hsl(var(--rpma-teal))] text-white shadow-sm cursor-pointer
          hover:opacity-90 transition-all duration-200
          ${isDragging ? 'opacity-60' : ''}
          ${className}
        `}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
      >
        <div className="text-[11px] font-medium truncate">
          {taskLabel}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        border-l-4 rounded-lg shadow-sm cursor-pointer
        hover:shadow-md hover:opacity-90 transition-all duration-200
        ${isDragging ? 'opacity-50' : ''}
        ${task.priority.toLowerCase() === 'urgent' ? 'animate-pulse' : ''}
        ${className}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      style={{
        backgroundColor: statusColors,
        borderColor: priorityColor,
      }}
    >
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-medium text-white text-sm truncate">
              {taskLabel}
            </h3>
          </div>
        </div>

        <div className="space-y-1 text-xs text-white/90">
          <div className="flex justify-between">
            <span>Vehicle:</span>
            <span className="font-medium text-white">{task.vehicle_plate || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Technician:</span>
            <span className="font-medium text-white">{task.technician_name || 'Unassigned'}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span className="font-medium text-white">{timeDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span>Priority:</span>
            <span className="font-medium px-2 py-1 rounded text-xs bg-white/20">
              {task.priority}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.mode === nextProps.mode &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.className === nextProps.className
  );
});

TaskCardComponent.displayName = 'TaskCard';

export const TaskCard = TaskCardComponent;
