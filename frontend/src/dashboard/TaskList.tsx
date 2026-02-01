'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TaskListProps } from './types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Clock, User, Car, CheckCircle, AlertCircle, Play } from 'lucide-react';

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  selectedTaskId,
  onTaskSelect,
  showTaskCount = true,
  emptyState,
  className
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Use virtual scrolling for large lists (>50 items)
  const shouldUseVirtualScrolling = tasks.length > 50;

  const virtualizer = useVirtualizer({
    count: shouldUseVirtualScrolling ? tasks.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated card height
    overscan: 5,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'termine':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'en_cours':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'en_attente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'termine':
        return 'bg-green-100 text-green-800';
      case 'en_cours':
        return 'bg-blue-100 text-blue-800';
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        {emptyState || (
          <div className="text-gray-500">
            <p>No tasks found</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {showTaskCount && (
        <div className="text-sm text-gray-600">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
        </div>
      )}

      {shouldUseVirtualScrolling ? (
        <div
          ref={parentRef}
          className="h-96 overflow-auto"
          style={{
            contain: 'strict',
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const task = tasks[virtualItem.index];
              return (
                <div
                  key={task.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Card
                    className={cn(
                      'p-4 cursor-pointer transition-all hover:shadow-md mb-3',
                      selectedTaskId === task.id && 'ring-2 ring-blue-500'
                    )}
                    onClick={() => onTaskSelect?.(task.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(task.status)}
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </h3>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Car className="h-3 w-3" />
                            <span>{task.vehicle}</span>
                          </div>

                          {task.technician && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{task.technician.name || `${task.technician.first_name} ${task.technician.last_name}`}</span>
                            </div>
                          )}

                          {task.scheduledDate && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(task.scheduledDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>

                    {task.progress > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md',
                selectedTaskId === task.id && 'ring-2 ring-blue-500'
              )}
              onClick={() => onTaskSelect?.(task.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(task.status)}
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Car className="h-3 w-3" />
                      <span>{task.vehicle}</span>
                    </div>

                    {task.technician && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{task.technician.name || `${task.technician.first_name} ${task.technician.last_name}`}</span>
                      </div>
                    )}

                    {task.scheduledDate && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(task.scheduledDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </div>

              {task.progress > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
