import React, { useMemo } from 'react';
import { TaskCard } from './TaskCard';
import type { CalendarTask } from '../../lib/backend';

interface AgendaViewProps {
  tasks: CalendarTask[];
  currentDate: Date;
  onTaskClick?: (task: CalendarTask) => void;
  className?: string;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  tasks,
  currentDate,
  onTaskClick,
  className = '',
}) => {
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Sort by date first
      const dateCompare = a.scheduled_date.localeCompare(b.scheduled_date);
      if (dateCompare !== 0) return dateCompare;

      // Then by start time
      if (a.start_time && b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      if (a.start_time && !b.start_time) return -1;
      if (!a.start_time && b.start_time) return 1;

      // Finally by task number
      return a.task_number.localeCompare(b.task_number);
    });
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, CalendarTask[]> = {};

    sortedTasks.forEach(task => {
      const date = task.scheduled_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(task);
    });

    return groups;
  }, [sortedTasks]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (startTime?: string | null, endTime?: string | null) => {
    if (!startTime) return 'Time TBD';
    if (!endTime) return startTime;
    return `${startTime} - ${endTime}`;
  };

  if (sortedTasks.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks scheduled</h3>
        <p className="text-gray-600">There are no tasks in the selected date range.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white ${className}`}>
      <div className="max-w-4xl mx-auto">
        {Object.entries(groupedTasks).map(([dateString, dayTasks]) => (
          <div key={dateString} className="mb-8">
            {/* Date header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {formatDate(dateString)}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Tasks for this date */}
            <div className="divide-y divide-gray-100">
              {dayTasks.map(task => (
                <div
                  key={task.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Time */}
                    <div className="flex-shrink-0 w-24 text-sm text-gray-500 pt-1">
                      {formatTime(task.start_time, task.end_time)}
                    </div>

                    {/* Task content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {task.task_number}: {task.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status.toLowerCase() === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          task.status.toLowerCase() === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          task.status.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Client:</span> {task.client_name || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Vehicle:</span> {task.vehicle_plate || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Technician:</span> {task.technician_name || 'Unassigned'}
                        </div>
                        <div>
                          <span className="font-medium">Priority:</span> {task.priority}
                        </div>
                      </div>

                      {task.estimated_duration && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Estimated duration:</span> {task.estimated_duration} minutes
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
