'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Plus, FileText, Search, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuotesListTable, QuotesStatusTabs } from '@/domains/quotes';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { FadeIn } from '@/shared/ui/animations/FadeIn';
import { useQuotesPage } from '@/domains/quotes';

const QuoteCharts = dynamic(
  () => import('@/domains/quotes/components/QuoteCharts').then(mod => ({ default: mod.QuoteCharts })),
  { 
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-[268px] rounded-lg border bg-card animate-pulse" />
        <div className="h-[268px] rounded-lg border bg-card animate-pulse" />
      </div>
    ),
    ssr: false 
  }
);

export default function QuotesPage() {
  const router = useRouter();
  const {
    searchQuery,
    activeTab,
    clientsLoading,
    quotes,
    quotesWithClients,
    total,
    loading,
    stats,
    pieChartData,
    monthlyData,
    trend,
    statusTabs,
    handleSearch,
    handleSearchSubmit,
    handleStatusChange,
    handleDeleteQuote,
    handleViewQuote,
    handleEditQuote,
    handleDuplicateQuote,
    handleConvertQuote,
    handleExportQuote,
  } = useQuotesPage();

  return (
    <PageShell>
      <FadeIn>
        <PageHeader
          title="Devis"
          subtitle={`${total} devis au total`}
          actions={
            <Link href="/quotes/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau devis
              </Button>
            </Link>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground', trend },
            { label: 'Brouillons', value: stats.draft, color: 'text-muted-foreground', trend: null },
            { label: 'Envoyés', value: stats.sent, color: 'text-primary', trend: null },
            { label: 'Acceptés', value: stats.accepted, color: 'text-green-600 dark:text-green-400', trend: null },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                {stat.trend !== null && stat.trend !== 0 && (
                  <span className={`flex items-center text-xs ${stat.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(stat.trend)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <QuoteCharts pieChartData={pieChartData} monthlyData={monthlyData} />

        <QuotesStatusTabs
          activeTab={activeTab}
          tabs={statusTabs}
          onTabChange={handleStatusChange}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="quote-search"
              type="text"
              placeholder="Rechercher un devis... (⌘K)"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearchSubmit}>
            Rechercher
          </Button>
        </div>

        {quotes.length === 0 && !loading ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="Aucun devis"
            description="Commencez par créer votre premier devis pour un client."
            action={{
              label: 'Créer un devis',
              onClick: () => router.push('/quotes/new'),
              icon: <Plus className="h-4 w-4" />,
            }}
          />
        ) : (
          <QuotesListTable
            quotes={quotesWithClients}
            loading={loading || clientsLoading}
            onRowClick={handleViewQuote}
            onView={handleViewQuote}
            onEdit={handleEditQuote}
            onDuplicate={handleDuplicateQuote}
            onDelete={handleDeleteQuote}
            onConvert={handleConvertQuote}
            onExport={handleExportQuote}
          />
        )}
      </FadeIn>
    </PageShell>
  );
}
