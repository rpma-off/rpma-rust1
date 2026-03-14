import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Car, Calendar, User, Shield, Eye, Edit, Trash2 } from 'lucide-react';
import { ipcClient } from '@/lib/ipc';
import { taskKeys } from '@/lib/query-keys';
import type { TaskWithDetails, TaskStatus } from '@/types/task.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardContent,
} from '@/shared/ui/facade';
import { getUserFullName } from '@/shared/utils';
import { useAuth } from '@/shared/hooks/useAuth';
import { getTaskDisplayTitle, getTaskDisplayStatus } from '@/domains/tasks/utils/display';
import {
  getStatusVariant,
  formatDateShort,
} from '@/domains/tasks/utils/task-presentation';

interface TaskListCardProps {
  task: TaskWithDetails;
  onView: (task: TaskWithDetails) => void;
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (task: TaskWithDetails) => void;
}

export const TaskListCard = React.memo(({
  task,
  onView,
  onEdit,
  onDelete
}: TaskListCardProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const getStatusLabel = useCallback((status: string) => {
    return getTaskDisplayStatus(status as TaskStatus);
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    return formatDateShort(dateString);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!user?.token) return;
    queryClient.prefetchQuery({
      queryKey: taskKeys.byId(task.id),
      queryFn: () => ipcClient.tasks.get(task.id),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient, task.id, user?.token]);

  return (
    <div className="animate-fadeIn" onMouseEnter={handleMouseEnter}>
      <Card className="hover:shadow-sm transition-all duration-200 border border-[hsl(var(--rpma-border))] hover:border-primary/30 bg-white rounded-[10px]">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4">
            {/* Header with Title and Status */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base md:text-lg font-semibold text-foreground line-clamp-2 flex-1 leading-tight">
                {getTaskDisplayTitle(task)}
              </h3>
              <Badge
                variant={getStatusVariant(task.status || 'pending') as "workflow-draft" | "workflow-inProgress" | "workflow-completed" | "workflow-cancelled" | "secondary"}
                className="shrink-0 text-xs px-2 py-1"
              >
                {getStatusLabel(task.status || 'pending')}
              </Badge>
            </div>

            {/* Key Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-foreground font-medium text-sm block truncate">
                    {task.vehicle_plate || 'Plaque non définie'}
                  </span>
                  <span className="text-muted-foreground text-xs truncate block">
                    {task.vehicle_make && task.vehicle_model ?
                      `${task.vehicle_make} ${task.vehicle_model}` :
                      'Véhicule non spécifié'
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground text-sm truncate">
                  {task.customer_name || 'Client non spécifié'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground text-sm">
                  {task.scheduled_date ? formatDate(task.scheduled_date) : 'Non planifiée'}
                </span>
              </div>

              {task.technician && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-sm truncate">
                    {getUserFullName(task.technician)}
                  </span>
                </div>
              )}
            </div>

            {/* PPF Zones - Show if available */}
            {task.ppf_zones && task.ppf_zones.length > 0 && (
              <div className="flex items-start gap-2 pt-2 border-t border-border/10">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground text-xs font-medium block mb-1">Zones PPF</span>
                  <div className="flex flex-wrap gap-1">
                    {task.ppf_zones.slice(0, 3).map((zone, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/30"
                      >
                        {zone}
                      </span>
                    ))}
                    {task.ppf_zones.length > 3 && (
                      <span className="text-muted-foreground text-xs">
                        +{task.ppf_zones.length - 3} autres
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(task)}
                className="h-8 w-8 p-0 hover:bg-muted/10 text-muted-foreground hover:text-foreground"
                title="Voir les détails"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(task)}
                className="h-8 w-8 p-0 hover:bg-muted/10 text-muted-foreground hover:text-foreground"
                title="Modifier"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer la tâche &ldquo;{task.title || `Tâche #${task.id.slice(0, 8)}`}&rdquo; ?
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(task)}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

TaskListCard.displayName = 'TaskListCard';
