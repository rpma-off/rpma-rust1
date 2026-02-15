'use client';

import React, { useState } from 'react';
import { Client } from '@/lib/backend';
import { ClientCard } from './ClientCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Grid,
  List,
  RefreshCw
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ClientListProps {
  clients: Client[];
  loading?: boolean;
  error?: string;
  onClientSelect?: (client: Client) => void;
  onClientEdit?: (client: Client) => void;
  onClientDelete?: (client: Client) => void;
  showActions?: boolean;
  selectable?: boolean;
  selectedClients?: string[];
  onSelectionChange?: (clientIds: string[]) => void;
}

export function ClientList({
  clients,
  loading = false,
  error,
  onClientSelect,
  onClientEdit,
  onClientDelete,
  showActions = true,
  selectable = false,
  selectedClients = [],
  onSelectionChange,
}: ClientListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Filter clients based on search and type
  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchQuery ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || client.customer_type === filterType;

    return matchesSearch && matchesType;
  });

  const virtualizer = useVirtualizer({
    count: filteredClients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => viewMode === 'grid' ? 200 : 120, // Estimated height based on view mode
    overscan: 5,
  });

  const handleClientSelect = (client: Client) => {
    if (selectable && onSelectionChange) {
      const isSelected = selectedClients.includes(client.id);
      if (isSelected) {
        onSelectionChange(selectedClients.filter(id => id !== client.id));
      } else {
        onSelectionChange([...selectedClients, client.id]);
      }
    } else if (onClientSelect) {
      onClientSelect(client);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Type filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="individual">Particuliers</SelectItem>
              <SelectItem value="business">Entreprises</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Client list */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun client trouvé
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || filterType !== 'all' 
              ? 'Essayez de modifier vos critères de recherche.'
              : 'Commencez par créer votre premier client.'
            }
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        filteredClients.length > 20 ? (
          <div
            ref={parentRef}
            className="h-96 overflow-auto"
            style={{
              contain: 'strict',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onView={onClientSelect}
                  onEdit={onClientEdit}
                  onDelete={onClientDelete}
                  showActions={showActions}
                  selectable={selectable}
                  selected={selectedClients.includes(client.id)}
                  onSelect={handleClientSelect}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onView={onClientSelect}
                onEdit={onClientEdit}
                onDelete={onClientDelete}
                showActions={showActions}
                selectable={selectable}
                selected={selectedClients.includes(client.id)}
                onSelect={handleClientSelect}
              />
            ))}
          </div>
        )
      ) : (
        <div
          ref={parentRef}
          className="h-96 overflow-auto"
          style={{
            contain: 'strict',
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const client = filteredClients[virtualItem.index];
              return (
                <div
                  key={client.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ClientCard
                    client={client}
                    onView={onClientSelect}
                    onEdit={onClientEdit}
                    onDelete={onClientDelete}
                    showActions={showActions}
                    selectable={selectable}
                    selected={selectedClients.includes(client.id)}
                    onSelect={handleClientSelect}
                    className="w-full mb-4"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
