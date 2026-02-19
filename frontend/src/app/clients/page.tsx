'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/domains/auth';
import { clientService } from '@/domains/clients';
import { Plus, Search, SearchX, User, Building, ChevronDown, ArrowUpDown, AlertCircle, Users, FileText } from 'lucide-react';
import Link from 'next/link';
import type { Client, ClientWithTasks } from '@/shared/types';
import type { ClientFilters } from '@/shared/types';
import { ClientCard } from '@/domains/clients';
import { ClientCardSkeleton } from '@/shared/ui/ui/skeleton';
import { PullToRefresh, FloatingActionButton } from '@/shared/ui/ui/mobile-components';
import { EnhancedEmptyState } from '@/shared/ui/ui';
import { PageHeader, StatCard } from '@/shared/ui/ui/page-header';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { useTranslation } from '@/shared/hooks/useTranslation';

const MemoizedClientCard = memo(ClientCard);


export default function ClientsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientFilters>({
    page: 1,
    page_size: 20,
    sort_by: 'name',
    sort_order: 'asc'
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Client filters are handled centrally in AppNavigation component

  const clientStats = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc.total += 1;
      if ((client.tasks || []).length > 0) {
        acc.withTasks += 1;
      }
      if (client.customer_type === 'individual') {
        acc.individual += 1;
      }
      if (client.customer_type === 'business') {
        acc.business += 1;
      }
      return acc;
    }, {
      total: 0,
      withTasks: 0,
      individual: 0,
      business: 0
    });
  }, [clients]);

  // Load clients
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await clientService.getClientsWithTasks(user?.token, {
        page: filters.page || 1,
        limit: filters.page_size || 20,
        sort_by: filters.sort_by || 'name',
        sort_order: filters.sort_order || 'asc',
        search: searchQuery || undefined,
        customer_type: filters.customer_type,
        has_tasks: filters.has_tasks,
        created_after: filters.created_after,
        created_before: filters.created_before
      }, 5);

      if (response.error) {
        setError(typeof response.error === 'string' ? response.error : response.error.message || t('errors.loadFailed'));
        return;
      }

      if (response.data?.data) {
        setClients(response.data.data);
      }
    } catch (err) {
      setError(t('errors.unexpected'));
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, user?.token, t]);

  // Load clients when component mounts or filters change
  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user, loadClients]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ClientFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Handle client actions
  const handleClientSelect = useCallback((client: Client | ClientWithTasks) => {
    router.push(`/clients/${client.id}`);
  }, [router]);

  const handleClientEdit = useCallback((client: Client | ClientWithTasks) => {
    router.push(`/clients/${client.id}/edit`);
  }, [router]);

  const handleClientDelete = useCallback(async (client: Client | ClientWithTasks) => {
    if (!confirm(t('confirm.deleteClient', { name: client.name }))) {
      return;
    }

    try {
      if (!user?.id) {
        setError(t('errors.authRequired'));
        return;
      }

      const response = await clientService.deleteClient(client.id, user.token);
      if (response.error) {
        setError(response.error || t('errors.deleteFailed'));
        return;
      }

      // Reload clients
      loadClients();
    } catch (err) {
      setError(t('errors.unexpected'));
      console.error('Error deleting client:', err);
    }
  }, [loadClients, user?.id, user?.token, t]);

  const handleClientCreateTask = useCallback((client: Client | ClientWithTasks) => {
    router.push(`/tasks/new?clientId=${client.id}`);
  }, [router]);

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    await loadClients();
  }, [loadClients]);



  const isInitialLoading = loading && clients.length === 0;

  return (
    <PageShell>
      {/* Header */}
      <PageHeader
        title={t('clients.title')}
        subtitle={t('clients.subtitle')}
        icon={<User className="h-6 w-6 sm:h-8 sm:w-8 text-[hsl(var(--rpma-teal))]" />}
        actions={
          <Link
            href="/clients/new"
            className="bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-black px-4 sm:px-6 py-3 rounded-[6px] flex items-center justify-center space-x-2 transition-all duration-200 font-semibold w-full lg:w-auto hover:shadow-sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium">{t('clients.addClient')}</span>
          </Link>
        }
        stats={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              value={clientStats.total}
              label={t('clients.totalClients')}
              icon={Users}
              color="accent"
            />
            <StatCard
              value={clientStats.withTasks}
              label={t('clients.withTasks')}
              icon={FileText}
              color="green"
            />
            <StatCard
              value={clientStats.individual}
              label={t('clients.individual')}
              icon={User}
              color="blue"
            />
            <StatCard
              value={clientStats.business}
              label={t('clients.business')}
              icon={Building}
              color="purple"
            />
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="rpma-shell p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('clients.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-[hsl(var(--rpma-teal))] transition-all duration-200"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={filters.customer_type || ''}
                  onChange={(e) => handleFilterChange({
                    customer_type: e.target.value as 'individual' | 'business' | undefined
                  })}
                  className="pl-10 pr-8 py-2.5 rpma-shell text-foreground text-sm focus:outline-none focus:border-[hsl(var(--rpma-teal))] transition-all duration-200 appearance-none cursor-pointer hover:bg-muted/10"
                >
                  <option value="">ðŸ¢ Tous les types</option>
                  <option value="individual">ðŸ‘¤ Particuliers</option>
                  <option value="business">ðŸ¢ Entreprises</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={filters.sort_by + '_' + filters.sort_order}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('_');
                    handleFilterChange({
                      sort_by: sortBy as 'name' | 'email' | 'created_at' | 'total_tasks',
                      sort_order: sortOrder as 'asc' | 'desc'
                    });
                  }}
                  className="pl-10 pr-8 py-2.5 rpma-shell text-foreground text-sm focus:outline-none focus:border-[hsl(var(--rpma-teal))] transition-all duration-200 appearance-none cursor-pointer hover:bg-muted/10"
                >
<option value="name_asc">{t('clients.sortNameAsc')}</option>
<option value="name_desc">{t('clients.sortNameDesc')}</option>
<option value="created_at_desc">{t('clients.sortNewest')}</option>
<option value="created_at_asc">{t('clients.sortOldest')}</option>
<option value="total_tasks_desc">{t('clients.sortMostTasks')}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <FloatingActionButton
        icon={<Plus className="w-6 h-6" />}
        onClick={() => router.push('/clients/new')}
        className="md:hidden"
      />

      {/* Error Message */}
      {error && (
        <div className="rpma-shell p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-error/10 border border-error/30 rounded-[6px]">
              <AlertCircle className="h-5 w-5 text-error" />
            </div>
            <div className="flex-1">
              <h4 className="text-foreground font-semibold mb-1">{t('errors.loadingError')}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Clients List */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="rpma-shell p-6">
          {isInitialLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ClientCardSkeleton key={i} />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <EnhancedEmptyState
              title={t('empty.noClients')}
              description={t('empty.noClientsDescription')}
              icon={<SearchX className="h-6 w-6" />}
              action={{
                label: t('clients.addClient'),
                onClick: () => router.push('/clients/new'),
                icon: <Plus className="h-4 w-4" />
              }}
              variant="search"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => (
                <div key={client.id}>
                  <MemoizedClientCard
                    client={client}
                    tasks={client.tasks || []}
                    onView={handleClientSelect}
                    onEdit={handleClientEdit}
                    onDelete={handleClientDelete}
                    onCreateTask={handleClientCreateTask}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Loading overlay */}
      {loading && clients.length > 0 && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
          <div className="rpma-shell p-6 shadow-lg pointer-events-auto">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-8 h-8 border-3 border-[hsl(var(--rpma-border))] rounded-full animate-spin border-t-accent"></div>
              </div>
              <div>
                <h4 className="text-foreground font-medium">{t('common.updating')}</h4>
                <p className="text-muted-foreground text-sm">{t('clients.refreshing')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}


