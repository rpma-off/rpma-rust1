import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, History, AlertCircle } from 'lucide-react';
import { useAuth } from '@/domains/auth';
import { taskGateway } from '../api/taskGateway';
import type { TaskHistoryEntry } from '../api/types';

interface TaskHistoryProps {
  taskId: string;
}

function toDate(value: number | string): Date {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(numeric)) {
    return new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric);
  }
  return new Date(value);
}

function formatStatusLabel(status?: string | null): string {
  return (status || 'unknown').split('_').join(' ');
}

function entryTitle(entry: TaskHistoryEntry): string {
  if (!entry.old_status) {
    return `Creation (${formatStatusLabel(entry.new_status)})`;
  }
  return `${formatStatusLabel(entry.old_status)} -> ${formatStatusLabel(entry.new_status)}`;
}

export function TaskHistory({ taskId }: TaskHistoryProps) {
  const { user } = useAuth();

  const { data: historyEntries, isLoading, error } = useQuery<TaskHistoryEntry[]>({
    queryKey: ['tasks', taskId, 'history'],
    queryFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifie');
      return taskGateway.getTaskHistory(taskId, user.token);
    },
    enabled: !!user?.token
  });

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

  if (!historyEntries || historyEntries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Aucun evenement disponible pour cette tache.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border -ml-px" />

        <div className="relative space-y-6">
          {historyEntries.map(entry => (
            <div key={entry.id} className="relative flex items-start group">
              <div className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-primary">
                {entry.new_status === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <History className="h-4 w-4" />
                )}
              </div>

              <div className="ml-16">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{entry.changed_by || 'Systeme'}</h4>
                  <span className="text-sm text-muted-foreground">
                    {format(toDate(entry.changed_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>

                <div className="mt-1 rounded-md border bg-card p-4">
                  <div className="flex items-center">
                    <span className="font-medium">Changement de statut</span>
                    <span className="mx-2 text-muted-foreground">&bull;</span>
                    <span className="text-sm text-muted-foreground">{entryTitle(entry)}</span>
                  </div>

                  {entry.reason && (
                    <div className="mt-3 text-sm bg-muted/20 p-3 rounded-md overflow-x-auto">
                      <p className="text-xs whitespace-pre-wrap">{entry.reason}</p>
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
