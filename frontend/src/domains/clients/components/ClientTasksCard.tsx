'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { ClientWithTasks } from '@/lib/backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/shared/hooks';

const formatClientDate = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';

interface ClientTasksCardProps {
  client: ClientWithTasks;
  clientId: string;
  onCreateTask: () => void;
}

export function ClientTasksCard({ client, clientId, onCreateTask }: ClientTasksCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('clients.recentTasks')}</CardTitle>
          {client.tasks && client.tasks.length > 5 && (
            <Link
              href={`/tasks?clientId=${clientId}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('clients.viewAll')} ({client.tasks.length})
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {client.tasks && client.tasks.length > 0 ? (
          <div className="space-y-4">
            {client.tasks.slice(0, 5).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="block p-4 bg-[hsl(var(--rpma-surface))] rounded-lg hover:bg-[hsl(var(--rpma-surface))] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-foreground font-medium mb-1">{task.title}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {task.vehicle_plate && <span>{t('tasks.plate')}: {task.vehicle_plate}</span>}
                      {task.vehicle_model && <span>{t('tasks.model')}: {task.vehicle_model}</span>}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge
                      variant={
                        task.status === 'completed' ? 'success' :
                        task.status === 'in_progress' ? 'default' :
                        'secondary'
                      }
                    >
                      {task.status?.replace('_', ' ')}
                    </Badge>
                    <p className="text-muted-foreground text-xs">
                      {formatClientDate(task.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{t('clients.noTasks')}</p>
            <Button onClick={onCreateTask} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('clients.createFirstTask')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
