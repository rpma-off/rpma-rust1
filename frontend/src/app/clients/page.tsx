'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { clientService } from '@/lib/services/entities/client.service';
import { Plus, Search, SearchX, Edit, Trash2, Eye, User, Building, ChevronDown, ArrowUpDown, RefreshCw, AlertCircle, Users, FileText, Calendar, Phone } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Client, ClientWithTasks } from '@/lib/backend';
import type { ClientFilters } from '@/types/client.types';
import { ClientCard } from '@/clients/ClientCard';
import { ClientCardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PullToRefresh, FloatingActionButton } from '@/components/ui/mobile-components';
import { EnhancedEmptyState } from '@/components/ui';
import { ClientFilters as ClientFiltersComponent } from '@/components/navigation/ClientFilters';
import { PageHeader, StatCard } from '@/components/ui/page-header';


export default function ClientsPage() {
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
        setError(typeof response.error === 'string' ? response.error : response.error.message || 'Échec du chargement des clients');
        return;
      }

      if (response.data?.data) {
        setClients(response.data.data);
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue');
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, user?.token]);

  // Load clients when component mounts or filters change
  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user, loadClients]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<ClientFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Handle client actions
  const handleClientSelect = (client: Client | ClientWithTasks) => {
    router.push(`/clients/${client.id}`);
  };

  const handleClientEdit = (client: Client | ClientWithTasks) => {
    router.push(`/clients/${client.id}/edit`);
  };

  const handleClientDelete = async (client: Client | ClientWithTasks) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${client.name} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      if (!user?.id) {
        setError('Authentification requise');
        return;
      }

      const response = await clientService.deleteClient(client.id, user.token);
      if (response.error) {
        setError(response.error || 'Échec de la suppression du client');
        return;
      }

      // Reload clients
      loadClients();
    } catch (err) {
      setError('Une erreur inattendue est survenue lors de la suppression');
      console.error('Error deleting client:', err);
    }
  };

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    await loadClients();
  }, [loadClients]);



  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-muted rounded-full animate-spin border-t-accent mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-accent mx-auto opacity-20"></div>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Chargement des clients...</h3>
          <p className="text-muted-foreground">Veuillez patienter pendant que nous récupérons vos données</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
      {/* Header */}
      <PageHeader
        title="Clients"
        subtitle="Gérer votre base de données clients et vos relations"
        icon={<User className="h-6 w-6 sm:h-8 sm:w-8 text-[hsl(var(--rpma-teal))]" />}
        actions={
          <Link
            href="/clients/new"
            className="bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-black px-4 sm:px-6 py-3 rounded-[6px] flex items-center justify-center space-x-2 transition-all duration-200 font-semibold w-full lg:w-auto hover:shadow-sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium">Ajouter un client</span>
          </Link>
        }
        stats={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              value={clients.length}
              label="Total Clients"
              icon={Users}
              color="accent"
            />
            <StatCard
              value={clients.filter(c => (c.tasks || []).length > 0).length}
              label="Avec Tâches"
              icon={FileText}
              color="green"
            />
            <StatCard
              value={clients.filter(c => c.customer_type === 'individual').length}
              label="Particuliers"
              icon={User}
              color="blue"
            />
            <StatCard
              value={clients.filter(c => c.customer_type === 'business').length}
              label="Entreprises"
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
                placeholder="Rechercher par nom, email, entreprise..."
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
<option value="name_asc">📝 Nom A-Z</option>
<option value="name_desc">📝 Nom Z-A</option>
<option value="created_at_desc">🕑 Plus récent</option>
<option value="created_at_asc">🕑 Plus ancien</option>
<option value="total_tasks_desc">📊 Plus de tâches</option>
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
              <h4 className="text-foreground font-semibold mb-1">Erreur de chargement</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Clients List */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="rpma-shell p-6">
          {loading && clients.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ClientCardSkeleton key={i} />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="rpma-empty">
              <SearchX />
              <h3 className="text-lg font-semibold">No results found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client, index) => (
                <div key={client.id}>
                  <ClientCard
                    client={client}
                    tasks={client.tasks || []}
                    onView={handleClientSelect}
                    onEdit={handleClientEdit}
                    onDelete={handleClientDelete}
                    onCreateTask={() => router.push('/tasks/new?clientId=' + client.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Loading overlay */}
      {loading && clients.length > 0 && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rpma-shell p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-8 h-8 border-3 border-[hsl(var(--rpma-border))] rounded-full animate-spin border-t-accent"></div>
              </div>
              <div>
                <h4 className="text-foreground font-medium">Mise à jour...</h4>
                <p className="text-muted-foreground text-sm">Actualisation de la liste des clients</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
