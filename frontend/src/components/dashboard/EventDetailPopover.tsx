'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { designTokens } from '@/lib/design-tokens';
import type { CalendarTask } from '@/lib/backend';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EventDetailPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarTask | null;
}

export function EventDetailPopover({ isOpen, onClose, event }: EventDetailPopoverProps) {
  const router = useRouter();

  if (!event || !isOpen) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: designTokens.colors.workflow.draft,
      scheduled: designTokens.colors.workflow.scheduled,
      in_progress: designTokens.colors.workflow.inProgress,
      completed: designTokens.colors.workflow.completed,
      cancelled: designTokens.colors.workflow.cancelled,
    };
    return colors[status] || designTokens.colors.textSecondary;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: designTokens.colors.priority.low,
      medium: designTokens.colors.priority.medium,
      high: designTokens.colors.priority.high,
      urgent: designTokens.colors.priority.urgent,
    };
    return colors[priority] || designTokens.colors.textSecondary;
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }

    try {
      const { taskService } = await import('@/domains/tasks');
      await taskService.deleteTask(event.id);
      onClose();
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={onClose}>
      <PopoverTrigger asChild>
        <div />
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{event.task_number}: {event.title}</h3>
            <p className="text-sm text-muted-foreground">{event.vehicle_plate || event.vehicle_model || 'N/A'}</p>
          </div>

          <div className="flex gap-2">
            <div
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: getStatusColor(event.status) }}
            >
              {event.status === 'draft' && 'Brouillon'}
              {event.status === 'scheduled' && 'Planifié'}
              {event.status === 'in_progress' && 'En cours'}
              {event.status === 'completed' && 'Terminé'}
              {event.status === 'cancelled' && 'Annulé'}
            </div>
            <div
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: getPriorityColor(event.priority) }}
            >
              {event.priority === 'low' && 'Basse'}
              {event.priority === 'medium' && 'Moyenne'}
              {event.priority === 'high' && 'Haute'}
              {event.priority === 'urgent' && 'Urgente'}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">
              {event.start_time} - {event.end_time}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(event.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {event.client_name && (
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm text-foreground">{event.client_name}</p>
            </div>
          )}

          {event.technician_name && (
            <div>
              <p className="text-xs text-muted-foreground">Technicien</p>
              <p className="text-sm text-foreground">{event.technician_name}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/tasks/${event.id}`)}
            >
              Voir détails
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/tasks/${event.id}/edit`)}
            >
              Modifier
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
