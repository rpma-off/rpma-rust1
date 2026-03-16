'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { TrashCategoryTab } from '@/domains/trash/components/TrashCategoryTab';
import { EmptyTrashDialog } from '@/domains/trash/components/EmptyTrashDialog';
import { useEmptyTrash } from '@/domains/trash/api';
import type { EntityType } from '@/types/trash';

const CATEGORIES: { value: EntityType; label: string }[] = [
  { value: 'Task', label: 'Tâches' },
  { value: 'Client', label: 'Clients' },
  { value: 'Quote', label: 'Devis' },
  { value: 'Material', label: 'Matériaux' },
  { value: 'Intervention', label: 'Interventions' },
  { value: 'Photo', label: 'Photos' },
  { value: 'Rapport', label: 'Rapports' },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<EntityType>('Task');
  const emptyTrashMutation = useEmptyTrash();
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;
  
  const handleEmptyAll = async () => {
    await emptyTrashMutation.mutateAsync(undefined);
  };

  return (
    <ErrorBoundary>
      <PageShell>
        <PageHeader
          title="Corbeille"
          subtitle="Gérez et restaurez les éléments supprimés"
          icon={<Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-[hsl(var(--rpma-teal))]" />}
          actions={
            isAdmin ? (
              <EmptyTrashDialog onConfirm={handleEmptyAll}>
                <Button variant="destructive" disabled={emptyTrashMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Vider toute la corbeille
                </Button>
              </EmptyTrashDialog>
            ) : undefined
          }
        />

        <div className="rpma-shell p-6 mt-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
            <TabsList className="mb-6 flex flex-wrap gap-2 h-auto p-1">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="px-4 py-2">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {CATEGORIES.map((cat) => (
              <TabsContent key={cat.value} value={cat.value}>
                <TrashCategoryTab entityType={cat.value} isAdmin={isAdmin} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </PageShell>
    </ErrorBoundary>
  );
}
