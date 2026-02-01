'use client';

import React from 'react';
import { RecentTasksPreviewProps } from './types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Car, CheckCircle, AlertCircle, Play } from 'lucide-react';

export const RecentTasksPreview: React.FC<RecentTasksPreviewProps> = ({ tasks, onTaskClick, className }) => {
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

  if (tasks.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
        <p className="text-gray-500 text-center py-4">No recent tasks</p>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => onTaskClick?.(task.id)}
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(task.status)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {task.title}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
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
                </div>
              </div>
            </div>
            <Badge className={getStatusColor(task.status)}>
              {task.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};
