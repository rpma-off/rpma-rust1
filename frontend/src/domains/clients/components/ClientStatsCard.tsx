'use client';

import type { ClientWithTasks } from '@/lib/backend';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/shared/hooks';

const formatClientDate = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';

interface ClientStatsCardProps {
  client: ClientWithTasks;
}

export function ClientStatsCard({ client }: ClientStatsCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('clients.clientOverview')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
            <div className="text-2xl font-bold text-foreground">{client.tasks?.length || 0}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.totalTasks')}</div>
          </div>
          <div className="text-center p-3 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">
              {client.tasks?.filter(task => task.status === 'completed').length || 0}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.completed')}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">{t('clients.inProgress')}</span>
            <Badge variant="default">
              {client.tasks?.filter(task => task.status === 'in_progress').length || 0}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">{t('clients.pending')}</span>
            <Badge variant="secondary">
              {client.tasks?.filter(task => task.status === 'pending').length || 0}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">{t('clients.clientSince')}</span>
            <span className="text-foreground text-sm font-medium">
              {formatClientDate(client.created_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
