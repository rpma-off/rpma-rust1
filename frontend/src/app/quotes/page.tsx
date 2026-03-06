'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Search, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { useQuotesList } from '@/domains/quotes';
import { computeQuoteStats } from '@/shared/types';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { QuotesListTable, QuotesStatusTabs } from '@/domains/quotes';
import { clientIpc } from '@/domains/clients/ipc/client.ipc';
import { useAuth } from '@/domains/auth';
import type { QuoteStatus } from '@/shared/types';
import type { Quote } from '@/types/quote.types';
import type { Client } from '@/types/client.types';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { FadeIn } from '@/shared/ui/animations/FadeIn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

type ActiveTab = 'all' | QuoteStatus;

interface QuoteWithClient extends Quote {
  client?: Client;
}

export default function QuotesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [clientMap, setClientMap] = useState<Record<string, Client>>({});
  const [clientsLoading, setClientsLoading] = useState(false);

  const { quotes, total, loading, error, updateFilters } = useQuotesList({
    autoFetch: true,
  });

  const fetchClientDetails = useCallback(async (clientIds: string[]) => {
    if (!user?.token || clientIds.length === 0) return;
    
    const uniqueIds = [...new Set(clientIds)].filter(id => !clientMap[id]);
    if (uniqueIds.length === 0) return;

    setClientsLoading(true);
    try {
      const response = await clientIpc.list({ search: '' }, user.token);
      const clients = response.data;
      const newMap: Record<string, Client> = {};
      clients.forEach((c: Client) => { newMap[c.id] = c; });
      setClientMap(prev => ({ ...prev, ...newMap }));
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
        fetchClientDetails(clientIds);
      }
    }
  }, [quotes, fetchClientDetails]);

  const quotesWithClients: QuoteWithClient[] = quotes.map(q => ({
    ...q,
    client: clientMap[q.client_id],
  }));

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
  }, [quotes]);

  const previousPeriodTotal = useMemo(() => {
    const now = new Date();
    let count = 0;
    quotes.forEach(q => {
      const d = new Date(q.created_at);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      if (d < sixMonthsAgo) count++;
    });
    return count;
  }, [quotes]);

  const trend = total > 0 && previousPeriodTotal > 0 
    ? Math.round(((total - previousPeriodTotal) / previousPeriodTotal) * 100) 
    : 0;

  useEffect(() => {
    if (error?.message) {
      toast.error(error.message);
    }
  }, [error]);

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              {pieChartData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tendance mensuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

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
