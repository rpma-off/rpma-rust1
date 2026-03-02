'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText } from 'lucide-react';
import Link from 'next/link';
import { useQuotesList } from '@/domains/quotes';
import { computeQuoteStats } from '@/shared/types';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { QuotesListTable, QuotesStatusTabs } from '@/domains/quotes/components';
import type { QuoteStatus } from '@/shared/types';

type ActiveTab = 'all' | QuoteStatus;

export default function QuotesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');

  const { quotes, total, loading, error, updateFilters } = useQuotesList({
    autoFetch: true,
  });

  const stats = computeQuoteStats(quotes);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = () => {
    updateFilters({ search: searchQuery || undefined });
  };

  const handleStatusChange = (tab: string) => {
    setActiveTab(tab as ActiveTab);
    updateFilters({
      status: tab === 'all' ? undefined : (tab as QuoteStatus),
    });
  };

  const handleDeleteQuote = async (quoteId: string) => {
    toast.info('Fonctionnalité de suppression à venir');
  };

  const handleViewQuote = (quoteId: string) => {
    router.push(`/quotes/${quoteId}`);
  };

  const handleEditQuote = (quoteId: string) => {
    router.push(`/quotes/${quoteId}`);
  };

  const handleDuplicateQuote = (quoteId: string) => {
    toast.info('Fonctionnalité de duplication à venir');
  };

  const handleConvertQuote = (quoteId: string) => {
    router.push(`/quotes/${quoteId}`);
  };

  const handleExportQuote = (quoteId: string) => {
    toast.info('Fonctionnalité d\'export PDF à venir');
  };

  const statusTabs = [
    { key: 'all', label: 'Tous', count: total },
    { key: 'draft', label: 'Brouillons', count: stats.draft },
    { key: 'sent', label: 'Envoyés', count: stats.sent },
    { key: 'accepted', label: 'Acceptés', count: stats.accepted },
    { key: 'rejected', label: 'Refusés', count: stats.rejected },
    { key: 'expired', label: 'Expirés', count: stats.expired },
    { key: 'converted', label: 'Convertis', count: stats.converted },
  ];

  useEffect(() => {
    if (error?.message) {
      toast.error(error.message);
    }
  }, [error]);

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} devis au total
            </p>
          </div>
          <Link
            href="/quotes/new"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Brouillons', value: stats.draft, color: 'text-gray-600' },
            { label: 'Envoyés', value: stats.sent, color: 'text-blue-600' },
            { label: 'Acceptés', value: stats.accepted, color: 'text-green-600' },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <QuotesStatusTabs
          activeTab={activeTab}
          tabs={statusTabs}
          onTabChange={handleStatusChange}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un devis..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
              className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearchSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Rechercher
          </button>
        </div>

        <QuotesListTable
          quotes={quotes}
          loading={loading}
          onRowClick={handleViewQuote}
          onView={handleViewQuote}
          onEdit={handleEditQuote}
          onDuplicate={handleDuplicateQuote}
          onDelete={handleDeleteQuote}
          onConvert={handleConvertQuote}
          onExport={handleExportQuote}
        />
      </div>
    </PageShell>
  );
}
