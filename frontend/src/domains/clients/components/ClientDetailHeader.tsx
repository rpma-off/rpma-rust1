'use client';

import Link from 'next/link';
import { Plus, Edit, Trash2, ArrowLeft, User, Building } from 'lucide-react';
import type { ClientWithTasks } from '@/lib/backend';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/shared/hooks';

const formatClientDate = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';

interface ClientDetailHeaderProps {
  client: ClientWithTasks;
  onEdit: () => void;
  onDelete: () => void;
  onCreateTask: () => void;
}

export function ClientDetailHeader({ client, onEdit, onDelete, onCreateTask }: ClientDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="rpma-shell p-4 md:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-start space-x-4 md:space-x-6">
          <Link
            href="/clients"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mt-2 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">{t('clients.backToClients')}</span>
            <span className="text-sm sm:hidden">{t('common.back')}</span>
          </Link>
          <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
            <Avatar className="h-12 w-12 md:h-16 md:w-16 flex-shrink-0">
              <AvatarFallback className="bg-[hsl(var(--rpma-surface))] text-foreground text-lg md:text-xl">
                {client.customer_type === 'business' ? <Building className="h-6 w-6 md:h-8 md:w-8" /> : <User className="h-6 w-6 md:h-8 md:w-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{client.name}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-2">
                <Badge variant={client.customer_type === 'business' ? 'secondary' : 'default'} className="w-fit">
                  {client.customer_type === 'business' ? t('clients.businessClient') : t('clients.individualClient')}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  {t('clients.since')} {formatClientDate(client.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
          <Button onClick={onCreateTask} size="sm" variant="default">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tasks.newTask')}</span>
          </Button>
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.edit')}</span>
          </Button>
          <Button onClick={onDelete} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.delete')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
