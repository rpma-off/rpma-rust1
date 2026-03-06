import React, { useCallback } from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import type { TaskWithDetails, TaskStatus } from '@/types/task.types';
import { getTaskDisplayTitle, getTaskDisplayStatus } from '@/domains/tasks/utils/display';
import {
  getStatusVariant,
  formatDateShort,
} from '@/domains/tasks/utils/task-presentation';
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
  VirtualizedTable,
} from '@/shared/ui/facade';
import { getUserFullName } from '@/shared/utils';

interface TaskListTableProps {
  tasks: TaskWithDetails[];
  onView: (task: TaskWithDetails) => void;
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (task: TaskWithDetails) => void;
}

export const TaskListTable = React.memo(({
  tasks,
  onView,
  onEdit,
  onDelete
}: TaskListTableProps) => {
  const getStatusLabel = useCallback((status: string) => {
    return getTaskDisplayStatus(status as TaskStatus);
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return '-';
    return formatDateShort(dateString);
  }, []);

  const columns = [
    {
      key: 'title',
      header: 'Tâche',
      width: 200,
      sortable: true,
      render: (_value: unknown, task: TaskWithDetails) => (
        <div>
          <div className="text-sm font-medium text-foreground line-clamp-1">
            {getTaskDisplayTitle(task)}
          </div>
          <div className="text-xs text-muted-foreground md:hidden">
            {task.vehicle_plate && `${task.vehicle_plate} • `}
            {formatDate(task.scheduled_date)}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Véhicule',
      width: 150,
      sortable: true,
      className: 'hidden sm:table-cell',
      render: (_value: unknown, task: TaskWithDetails) => (
        <div>
          <div className="text-sm text-foreground">
            {task.vehicle_make && task.vehicle_model
              ? `${task.vehicle_make} ${task.vehicle_model}`
              : task.vehicle_plate || '-'
            }
          </div>
          <div className="text-xs text-muted-foreground">
            {task.vehicle_plate}
          </div>
        </div>
      ),
    },
    {
      key: 'customer_name',
      header: 'Client',
      width: 150,
      sortable: true,
      render: (value: unknown) => (
        <div className="text-sm text-foreground">
          {String(value || '-')}
        </div>
      ),
    },
    {
      key: 'scheduled_date',
      header: 'Date',
      width: 120,
      sortable: true,
      className: 'hidden md:table-cell',
      render: (value: unknown) => (
        <div className="text-sm text-foreground">
          {formatDate(value as string | null)}
        </div>
      ),
    },
    {
      key: 'ppf_zones',
      header: 'Zones PPF',
      width: 120,
      className: 'hidden md:table-cell',
      render: (value: unknown) => (
        <div className="text-sm text-foreground">
          {(value as string[])?.length ? (value as string[]).join(', ') : '-'}
        </div>
      ),
    },
    {
      key: 'technician',
      header: 'Technicien',
      width: 150,
      className: 'hidden lg:table-cell',
      render: (_value: unknown, task: TaskWithDetails) => (
        <div className="text-sm text-foreground">
          {task.technician ? getUserFullName(task.technician) : '-'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: 120,
      sortable: true,
      render: (value: unknown) => (
        <Badge
          variant={getStatusVariant((value as string) || 'pending') as "workflow-draft" | "workflow-inProgress" | "workflow-completed" | "workflow-cancelled" | "secondary"}
          className="text-xs"
        >
          {getStatusLabel((value as string) || 'pending')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 140,
      render: (_value: unknown, task: TaskWithDetails) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(task);
            }}
            className="h-8 w-8 p-0 touch-manipulation"
            title="Voir les détails"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="h-8 w-8 p-0 touch-manipulation"
            title="Modifier"
          >
            <Edit className="h-3 w-3" />
          </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 touch-manipulation"
                  title="Supprimer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-3 w-3" />
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
      ),
    },
  ];

  return (
    <VirtualizedTable
      data={tasks}
      columns={columns}
      height={600}
      rowHeight={60}
      onRowClick={(task) => onView(task)}
      className="bg-background"
    />
  );
});

TaskListTable.displayName = 'TaskListTable';
