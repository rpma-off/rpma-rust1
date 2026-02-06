import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit3, Trash, UserPlus, Check, History, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { taskService } from '@/lib/services/entities/task.service';
import { TaskWithDetails } from '@/types/task.types';

type ChangeLog = {
  id: string;
  action: string;
  changed_at: string;
  changed_by: {
    id: string;
    full_name: string;
    email: string;
  };
  change_detail: {
    before?: {
      status?: string;
      technician_id?: string;
      scheduled_at?: string;
      [key: string]: unknown;
    };
    after?: {
      status?: string;
      technician_id?: string;
      scheduled_at?: string;
      [key: string]: unknown;
    };
  };
};

interface TaskHistoryProps {
  taskId: string;
}

export function TaskHistory({ taskId }: TaskHistoryProps) {
  const { user } = useAuth();

  const { data: changeLogs, isLoading, error } = useQuery<ChangeLog[]>({
    queryKey: ['tasks', taskId, 'history'],
    queryFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');

      const response = await taskService.getTaskById(taskId);
      const history = (response.data as TaskWithDetails & { history?: unknown[] }).history || [];
      return history as ChangeLog[];
    }
  });

  const formatChangeDetail = (log: ChangeLog) => {
    const { action, change_detail } = log;

    switch (action) {
      case 'create':
        return 'La tâche a été créée';

      case 'update': {
        const changes: string[] = [];

        if (change_detail.before?.status !== change_detail.after?.status) {
          changes.push(`statut: "${change_detail.before?.status}" -> "${change_detail.after?.status}"`);
        }

        if (change_detail.before?.technician_id !== change_detail.after?.technician_id) {
          const before = change_detail.before?.technician_id ? 'assignée' : 'non assignée';
          const after = change_detail.after?.technician_id ? 'assignée' : 'non assignée';
          changes.push(`affectation technicien: ${before} -> ${after}`);
        }

        if (change_detail.before?.scheduled_at !== change_detail.after?.scheduled_at) {
          const before = change_detail.before?.scheduled_at
            ? format(new Date(change_detail.before.scheduled_at), 'dd/MM/yyyy')
            : 'non défini';
          const after = change_detail.after?.scheduled_at
            ? format(new Date(change_detail.after.scheduled_at), 'dd/MM/yyyy')
            : 'non défini';
          changes.push(`date planifiée: "${before}" -> "${after}"`);
        }

        return changes.length > 0 ? changes.join(', ') : 'Les détails ont été mis à jour';
      }

      case 'delete':
        return 'La tâche a été supprimée';

      default:
        return JSON.stringify(change_detail, null, 2);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex space-x-3 p-4 border rounded-md">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur lors du chargement de l&apos;historique</h3>
            <div className="mt-2 text-sm text-red-700">{error.message}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!changeLogs || changeLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Aucun événement disponible pour cette tâche.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border -ml-px" />

        <div className="relative space-y-6">
          {changeLogs.map(log => (
            <div key={log.id} className="relative flex items-start group">
              <div className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-primary">
                {getActionIcon(log.action)}
              </div>

              <div className="ml-16">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{log.changed_by.full_name || 'Système'}</h4>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>

                <div className="mt-1 rounded-md border bg-card p-4">
                  <div className="flex items-center">
                    <span className="font-medium capitalize">{log.action.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    <span className="mx-2 text-muted-foreground">&bull;</span>
                    <span className="text-sm text-muted-foreground">{formatChangeDetail(log)}</span>
                  </div>

                  {log.action === 'update' && log.change_detail && (
                    <div className="mt-3 text-sm bg-muted/20 p-3 rounded-md overflow-x-auto">
                      <pre className="text-xs">{JSON.stringify(log.change_detail, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getActionIcon(action: string) {
  const iconProps = { className: 'h-4 w-4' };

  switch (action) {
    case 'create':
      return <Plus {...iconProps} />;
    case 'update':
      return <Edit3 {...iconProps} />;
    case 'delete':
      return <Trash {...iconProps} />;
    case 'assign':
      return <UserPlus {...iconProps} />;
    case 'complete':
      return <Check {...iconProps} />;
    default:
      return <History {...iconProps} />;
  }
}
