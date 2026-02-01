"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, User, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserFullName, BaseUserAccount } from '@/lib/types';
import { TaskListProps } from './types';
import { DashboardTask } from './types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getDashboardTaskDisplayTitle, getTaskDisplayStatus, getTaskDisplayPriority } from '@/lib/utils/task-display';

export function TaskList({ tasks, onTaskClick, className }: TaskListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Helper function to get technician name from DashboardTask technician type
  const getTechnicianName = (technician: DashboardTask['technician']) => {
    if (!technician) return 'Non assigné';
    if (technician.name) return technician.name;
    if (technician.first_name && technician.last_name) {
      return `${technician.first_name} ${technician.last_name}`.trim();
    }
    return technician.initials || 'Non assigné';
  };

  const getStatusColor = (status: DashboardTask['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: DashboardTask['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated height of each task item
    overscan: 5,
  });

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Tâches Récentes</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune tâche trouvée
          </div>
        ) : (
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
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onTaskClick?.(task.id)}
              >
                 <div className="flex items-center space-x-4">
                   <Avatar className="h-10 w-10">
                     <AvatarFallback>
                       {task.technician?.initials || 'U'}
                     </AvatarFallback>
                   </Avatar>
                    <div>
                      <h4 className="font-medium">{getDashboardTaskDisplayTitle(task)}</h4>
                     <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                       <User className="h-4 w-4" />
                         <span>{getTechnicianName(task.technician)}</span>
                       <span>•</span>
                       <span>{task.vehicle}</span>
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(task.status)}>
                      {getTaskDisplayStatus(task.status)}
                    </Badge>
                     <Badge variant="outline" className={getPriorityColor(task.priority)}>
                       {getTaskDisplayPriority(task.priority)}
                     </Badge>
                   {task.scheduledDate && (
                     <div className="flex items-center text-sm text-muted-foreground">
                       <Calendar className="h-4 w-4 mr-1" />
                       {new Date(task.scheduledDate).toLocaleDateString()}
                     </div>
                   )}
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}