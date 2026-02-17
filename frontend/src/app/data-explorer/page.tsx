'use client';

import React from 'react';
import { Database, Search, BarChart3, RefreshCw, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { TooltipProvider } from '@/shared/ui/ui/tooltip';
import { DataExplorer } from '@/app/reports/components/data-explorer/DataExplorer';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { PageHeader } from '@/shared/ui/ui/page-header';
import { SectionCard } from '@/shared/ui/layout/SectionCard';
import { useTranslation } from '@/shared/hooks/useTranslation';



export default function DataExplorerPage() {
  const { t } = useTranslation();
  return (
    <TooltipProvider>
      <PageShell>
        <PageHeader
          title={t('nav.dataExplorer')}
          subtitle="Explorez, recherchez et analysez votre base de données PPF en temps réel"
          icon={<Database className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
        >
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="secondary" className="px-3 py-1.5 bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
              <Search className="h-3 w-3 mr-1.5" />
              Recherche Avancée
            </Badge>
            <Badge variant="secondary" className="px-3 py-1.5 bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Temps Réel
            </Badge>
            <Badge variant="secondary" className="px-3 py-1.5 bg-[hsl(var(--rpma-surface))] text-muted-foreground border-[hsl(var(--rpma-border))]">
              <Shield className="h-3 w-3 mr-1.5" />
              Sécurisé
            </Badge>
          </div>
        </PageHeader>

        <SectionCard
          title="Actions rapides"
          description="Commencez à explorer vos données"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="font-semibold flex-1 sm:flex-none">
              <Search className="h-5 w-5 mr-2" />
              Commencer l&apos;Exploration
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border text-foreground hover:bg-[hsl(var(--rpma-surface))] flex-1 sm:flex-none"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              {t('reports.statistics')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border text-foreground hover:bg-[hsl(var(--rpma-surface))] flex-1 sm:flex-none"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              {t('common.refresh')}
            </Button>
          </div>
        </SectionCard>

        <Card>
          <CardHeader className="border-b border-[hsl(var(--rpma-border))]">
            <CardTitle className="flex items-center justify-between text-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                  <Database className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold">Base de Données PPF</h3>
                  <p className="text-muted-foreground text-sm">Exploration et analyse de vos données</p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))] p-4">
              <DataExplorer />
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </TooltipProvider>
  );
}

