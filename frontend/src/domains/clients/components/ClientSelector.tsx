'use client';

import React, { useState, useEffect, useId, useCallback } from 'react';
import { KeyboardNavigation } from '@/lib/accessibility.ts';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client } from '@/lib/backend';
import { AuthSecureStorage } from '@/lib/secureStorage';
import { clientIpc } from '../ipc/client.ipc';

interface ClientSelectorProps {
  value?: string;
  onValueChange: (clientId: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ClientSelector({
  value,
  onValueChange,
  placeholder = "Sélectionner un client...",
  disabled = false,
  className
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedClient = clients.find(client => client.id === value);

  const fetchClients = useCallback(async (query: string = '') => {
    try {
      setLoading(true);
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        throw new Error('Authentication required');
      }
      if (query.trim()) {
        const data = await clientIpc.search(query, 20, session.token);
        setClients(data);
      } else {
        const result = await clientIpc.list({
          page: 1,
          limit: 100,
          sort_by: 'name',
          sort_order: 'asc',
        }, session.token);
        setClients(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients(searchQuery);
  }, [searchQuery, fetchClients]);

  const handleSelect = (clientId: string) => {
    onValueChange(clientId === value ? undefined : clientId);
    setOpen(false);
  };

  const handleCreateNew = () => {
    // Open new client form in a new tab or modal
    window.open('/clients/new', '_blank');
  };

  // Generate unique IDs for accessibility
  const uniqueId = useId();
  const selectorId = `client-selector-${uniqueId}`;
  const labelId = `client-selector-label-${uniqueId}`;
  const listboxId = `client-selector-listbox-${uniqueId}`;

  // Keyboard navigation for dropdown
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (KeyboardNavigation.isActivationKey(event.key) && !open) {
      setOpen(true);
      event.preventDefault();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          id={selectorId}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-labelledby={labelId}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          className={cn("w-full justify-between", className)}
          disabled={disabled}
          onKeyDown={handleKeyDown}
        >
          {selectedClient ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{selectedClient.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Rechercher un client..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            aria-label="Rechercher un client"
            aria-autocomplete="list"
          />
          <CommandList id={listboxId} role="listbox" aria-label="Liste des clients">
            <CommandEmpty>
              {loading ? (
                <div
                  className="py-6 text-center text-sm text-muted-foreground"
                  aria-live="polite"
                >
                  Chargement...
                </div>
              ) : (
                <div className="py-6 text-center text-sm">
                  <p className="text-muted-foreground mb-2">Aucun client trouvé.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateNew}
                    className="mt-2"
                    aria-label="Créer un nouveau client"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un nouveau client
                  </Button>
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => handleSelect(client.id)}
                  className="flex items-center gap-2"
                  role="option"
                  aria-selected={value === client.id}
                  data-highlighted={value === client.id ? "true" : "false"}
                  onKeyDown={(e) => {
                    // Handle keyboard navigation
                    if (KeyboardNavigation.isActivationKey(e.key)) {
                      handleSelect(client.id);
                      e.preventDefault();
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <User className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{client.name}</span>
                      {client.company_name && (
                        <Badge variant="secondary" className="text-xs">
                          {client.company_name}
                        </Badge>
                      )}
                    </div>
                    {client.email && (
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
