'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { clientService } from '@/lib/services/entities/client.service';
import { Plus, Search, Edit, Trash2, Eye, User, Building, ChevronDown, ArrowUpDown, RefreshCw } from 'lucide-react';
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
        setError(typeof response.error === 'string' ? response.error : response.error.message || 'Failed to load clients');
        return;
      }

      if (response.data?.data) {
        setClients(response.data.data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
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
    if (!confirm('Are you sure you want to delete ' + client.name + '? This action cannot be undone.')) {
      return;
    }

    try {
      if (!user?.id) {
        setError('Authentication required');
        return;
      }

      const response = await clientService.deleteClient(client.id, user.token);
      if (response.error) {
        setError(response.error || 'Failed to delete client');
        return;
      }

      // Reload clients
      loadClients();
    } catch (err) {
      setError('An unexpected error occurred while deleting the client');
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
            <div className="w-16 h-16 border-4 border-zinc-700 rounded-full animate-spin border-t-blue-500 mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-green-400 mx-auto opacity-20"></div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Chargement des clients...</h3>
          <p className="text-zinc-400">Veuillez patienter pendant que nous récupérons vos données</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Clients</h1>
            <p className="text-zinc-400 text-base sm:text-lg">
              Manage your client database and relationships
            </p>
          </div>
        </div>
        <Link
          href="/clients/new"
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 sm:px-6 py-3 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">Add Client</span>
        </Link>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-xl p-4 md:p-6 shadow-lg border border-zinc-700/50">
        <div className="flex flex-col gap-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, entreprise..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-800/50 border border-zinc-600 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <select
                  value={filters.customer_type || ''}
                  onChange={(e) => handleFilterChange({
                    customer_type: e.target.value as 'individual' | 'business' | undefined
                  })}
                  className="pl-10 pr-8 py-2.5 bg-zinc-800/50 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 appearance-none cursor-pointer hover:bg-zinc-700/50"
                >
                  <option value="">🏢 Tous les types</option>
                  <option value="individual">👤 Particuliers</option>
                  <option value="business">🏢 Entreprises</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <select
                  value={filters.sort_by + '_' + filters.sort_order}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('_');
                    handleFilterChange({
                      sort_by: sortBy as 'name' | 'email' | 'created_at' | 'total_tasks',
                      sort_order: sortOrder as 'asc' | 'desc'
                    });
                  }}
                  className="pl-10 pr-8 py-2.5 bg-zinc-800/50 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 appearance-none cursor-pointer hover:bg-zinc-700/50"
                >
                  <option value="name_asc">📝 Nom A-Z</option>
                  <option value="name_desc">📝 Nom Z-A</option>
                  <option value="created_at_desc">🕒 Plus récent</option>
                  <option value="created_at_asc">🕒 Plus ancien</option>
                  <option value="total_tasks_desc">📊 Plus de tâches</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
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
        <div className="bg-gradient-to-r from-red-900/50 to-red-800/30 border border-red-700/50 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-red-300 font-semibold mb-1">Erreur de chargement</h4>
              <p className="text-red-200 text-sm leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Clients List */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="bg-zinc-900 rounded-lg p-6">
          {loading && clients.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ClientCardSkeleton key={i} />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="text-white">No clients found</div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900/90 border border-zinc-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-8 h-8 border-3 border-zinc-600 rounded-full animate-spin border-t-blue-500"></div>
              </div>
              <div>
                <h4 className="text-white font-medium">Mise à jour...</h4>
                <p className="text-zinc-400 text-sm">Actualisation de la liste des clients</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
