import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/layout/EmptyState';
import { ClipboardList } from 'lucide-react';

export default function AuditPage() {
  return (
    <PageShell>
      <PageHeader
        title="Audit"
        subtitle="Suivez les actions et modifications du système"
        icon={<ClipboardList className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
      />
      <EmptyState
        icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
        title="Aucun journal d'audit"
        description="Les événements d'audit apparaîtront ici."
      />
    </PageShell>
  );
}
