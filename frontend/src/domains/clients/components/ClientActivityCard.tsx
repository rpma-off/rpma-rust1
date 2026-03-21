'use client';

import Link from 'next/link';
import type { ClientWithTasks } from '@/lib/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/shared/hooks';

const formatClientDate = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';

interface ClientActivityCardProps {
  client: ClientWithTasks;
  clientId: string;
}

export function ClientActivityCard({ client, clientId }: ClientActivityCardProps) {
  const { t } = useTranslation();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('clients.recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {client.tasks && client.tasks.length > 0 ? (
            <div className="space-y-3">
              {client.tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center space-x-3 p-2 bg-[hsl(var(--rpma-surface))] rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-success' :
                    task.status === 'in_progress' ? 'bg-info' :
                    'bg-[hsl(var(--rpma-teal))]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatClientDate(task.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {client.tasks.length > 3 && (
                <Link
                  href={`/tasks?clientId=${clientId}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors block text-center pt-2"
                >
                  {t('clients.viewAllActivity')} →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">{t('clients.noRecentActivity')}</p>
          )}
        </CardContent>
      </Card>

      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t('clients.notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-relaxed">{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
