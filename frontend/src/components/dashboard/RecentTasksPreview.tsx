"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecentTasksPreviewProps } from './types';
import { DashboardTask } from './types';

export function RecentTasksPreview({
  tasks = [],
  onTaskClick,
  className
}: RecentTasksPreviewProps) {
  
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

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tâches Récentes</CardTitle>
        <Button variant="ghost" size="sm">
          Voir tout
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune tâche récente à afficher.
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onTaskClick?.(task.id)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getTechnicianName(task.technician).charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{getTechnicianName(task.technician)}</span>
                      <Calendar className="h-3 w-3" />
                      <span>{task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'Non planifiée'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(task.status)} variant="secondary">
                    {task.status === 'completed' ? 'Terminé' :
                     task.status === 'in_progress' ? 'En cours' : 'Planifiée'}
                  </Badge>
                  <Badge className={getPriorityColor(task.priority)} variant="outline">
                    {task.priority === 'urgent' ? 'Urgente' :
                     task.priority === 'high' ? 'Haute' :
                     task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
