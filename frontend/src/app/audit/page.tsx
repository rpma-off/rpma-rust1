import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/layout/EmptyState';
import { ClipboardList } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function AuditPage() {
  const { t } = useTranslation();
  
  return (
    <PageShell>
      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.activity')}
        icon={<ClipboardList className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
      />
      <EmptyState
        icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
        title={t('audit.log')}
        description={t('empty.noData')}
      />
    </PageShell>
  );
}
