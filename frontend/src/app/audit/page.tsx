'use client';

import React from 'react';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { PageHeader } from '@/shared/ui/ui/page-header';
import { EmptyState } from '@/shared/ui/layout/EmptyState';
import { ClipboardList } from 'lucide-react';
import { useTranslation } from '@/shared/hooks/useTranslation';

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

