import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { QuoteStatus } from '@/shared/types';
import type { Quote } from '@/types/quote.types';
import type { Client } from '@/types/client.types';
import { useAuth } from '@/shared/hooks/useAuth';
import { computeQuoteStats } from '../utils/quote-stats';
import { fetchClientMap } from '../services/quote-client-enrichment.service';
import { useQuotesList, useDeleteQuote, useDuplicateQuote, useQuoteExportPdf, useQuoteStats } from './useQuotes';

export type ActiveTab = 'all' | QuoteStatus;

export interface QuoteWithClient extends Quote {
  client?: Client;
}

export function useQuotesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [clientMap, setClientMap] = useState<Record<string, Client>>({});
  const [clientsLoading, setClientsLoading] = useState(false);

  const { quotes, total, loading, error, updateFilters } = useQuotesList({
    autoFetch: true,
    onError: (err) => toast.error(err.message),
  });
  const { deleteQuote } = useDeleteQuote();
  const { duplicateQuote } = useDuplicateQuote();
  const { exportPdf } = useQuoteExportPdf();
  const { stats: backendStats } = useQuoteStats();

  const loadClients = useCallback(async (clientIds: string[]) => {
    if (!user?.token || clientIds.length === 0) return;

    const uniqueIds = [...new Set(clientIds)].filter(id => !clientMap[id]);
    if (uniqueIds.length === 0) return;

    setClientsLoading(true);
    try {
      const map = await fetchClientMap();
      setClientMap(prev => ({ ...prev, ...map }));
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setClientsLoading(false);
    }
  }, [user?.token, clientMap]);

  useEffect(() => {
    if (quotes.length > 0) {
      const clientIds = quotes.map(q => q.client_id).filter(Boolean);
      if (clientIds.length > 0) {
        loadClients(clientIds);
      }
    }
  }, [quotes, loadClients]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('quote-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const quotesWithClients: QuoteWithClient[] = quotes.map(q => ({
    ...q,
    client: clientMap[q.client_id],
  }));

  // Use backend stats for accurate counts across all pages; fall back to paginated local stats
  const stats = backendStats ?? computeQuoteStats(quotes);

  const pieChartData = useMemo(() => {
    const statuses = [
      { key: 'draft', label: 'Brouillons', color: '#6b7280' },
      { key: 'sent', label: 'Envoyés', color: '#3b82f6' },
      { key: 'accepted', label: 'Acceptés', color: '#22c55e' },
      { key: 'rejected', label: 'Refusés', color: '#ef4444' },
      { key: 'expired', label: 'Expirés', color: '#f59e0b' },
      { key: 'converted', label: 'Convertis', color: '#8b5cf6' },
    ];
    return statuses
      .filter(s => stats[s.key as keyof typeof stats] > 0)
      .map(s => ({
        name: s.label,
        value: stats[s.key as keyof typeof stats],
        color: s.color,
      }));
  }, [stats]);

  const monthlyData = useMemo(() => {
    if (backendStats) {
      return backendStats.monthlyCounts.map(m => ({ month: m.month, count: m.count }));
    }
    // Fallback: compute from paginated quotes (inaccurate for large datasets)
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('fr-FR', { month: 'short' });
      months[key] = 0;
    }
    quotes.forEach(q => {
      const d = new Date(q.created_at);
      const key = d.toLocaleDateString('fr-FR', { month: 'short' });
      if (months[key] !== undefined) {
        months[key]++;
      }
    });
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [backendStats, quotes]);

  const trend = useMemo(() => {
    const now = new Date();
    let previousCount = 0;
    quotes.forEach(q => {
      const d = new Date(q.created_at);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      if (d < sixMonthsAgo) previousCount++;
    });
    return total > 0 && previousCount > 0
      ? Math.round(((total - previousCount) / previousCount) * 100)
      : 0;
  }, [quotes, total]);

  const statusTabs = [
    { key: 'all', label: 'Tous', count: total },
    { key: 'draft', label: 'Brouillons', count: stats.draft },
    { key: 'sent', label: 'Envoyés', count: stats.sent },
    { key: 'accepted', label: 'Acceptés', count: stats.accepted },
    { key: 'rejected', label: 'Refusés', count: stats.rejected },
    { key: 'expired', label: 'Expirés', count: stats.expired },
    { key: 'converted', label: 'Convertis', count: stats.converted },
  ];

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = () => {
    updateFilters({ search: searchQuery || undefined });
  };

  const handleStatusChange = (tab: string) => {
    setActiveTab(tab as ActiveTab);
    updateFilters({ status: tab === 'all' ? undefined : (tab as QuoteStatus) });
  };

  const handleDeleteQuote = useCallback(async (quoteId: string) => {
    const success = await deleteQuote(quoteId);
    if (success) {
      toast.success('Devis supprimé');
    } else {
      toast.error('Erreur lors de la suppression du devis');
    }
  }, [deleteQuote]);

  const handleViewQuote = (quoteId: string) => router.push(`/quotes/${quoteId}`);
  const handleEditQuote = (quoteId: string) => router.push(`/quotes/${quoteId}`);
  const handleConvertQuote = (quoteId: string) => router.push(`/quotes/${quoteId}`);

  const handleDuplicateQuote = useCallback(async (quoteId: string) => {
    const quote = await duplicateQuote(quoteId);
    if (quote) {
      toast.success('Devis dupliqué');
      router.push(`/quotes/${quote.id}`);
    } else {
      toast.error('Erreur lors de la duplication du devis');
    }
  }, [duplicateQuote, router]);

  const handleExportQuote = useCallback(async (quoteId: string) => {
    const result = await exportPdf(quoteId);
    if (result) {
      toast.success('PDF exporté avec succès');
    } else {
      toast.error('Erreur lors de l\'export PDF');
    }
  }, [exportPdf]);

  return {
    searchQuery,
    activeTab,
    clientsLoading,
    quotes,
    quotesWithClients,
    total,
    loading,
    error,
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
  };
}
