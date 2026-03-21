'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { EmptyState } from '@/components/ui';
import { useClientDetailPage } from '@/domains/clients';
import { ClientDetailHeader } from '@/domains/clients/components/ClientDetailHeader';
import { ClientContactCard } from '@/domains/clients/components/ClientContactCard';
import { ClientTasksCard } from '@/domains/clients/components/ClientTasksCard';
import { ClientStatsCard } from '@/domains/clients/components/ClientStatsCard';
import { ClientActivityCard } from '@/domains/clients/components/ClientActivityCard';

interface ClientDetailPageProps {
  params: {
    id: string;
  };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const {
    client,
    loading,
    error,
    t,
    handleEdit,
    handleDelete,
    handleCreateTask,
  } = useClientDetailPage({ params });

  if (loading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !client) {
    return (
      <PageShell>
        <div className="flex items-center space-x-4 mb-6">
          <Link
            href="/clients"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('clients.backToClients')}</span>
          </Link>
        </div>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <EmptyState
              icon={<ArrowLeft className="h-12 w-12 text-muted-foreground" />}
              title={error || t('clients.notFound')}
              description={t('clients.checkId')}
            />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ClientDetailHeader
        client={client}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateTask={handleCreateTask}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <ClientContactCard client={client} />
          <ClientTasksCard client={client} clientId={params.id} onCreateTask={handleCreateTask} />
        </div>
        <div className="space-y-6">
          <ClientStatsCard client={client} />
          <ClientActivityCard client={client} clientId={params.id} />
        </div>
      </div>
    </PageShell>
  );
}
