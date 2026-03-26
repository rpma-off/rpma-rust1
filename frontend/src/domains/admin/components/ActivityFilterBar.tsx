'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuditEventTypes } from '../hooks/useUserActivity';
import type { AuditActivityFilter } from '@/lib/backend';

const RESOURCE_TYPES = [
  { value: 'task', label: 'Tâches' },
  { value: 'client', label: 'Clients' },
  { value: 'intervention', label: 'Interventions' },
  { value: 'inventory', label: 'Inventaire' },
  { value: 'quote', label: 'Devis' },
  { value: 'user', label: 'Utilisateurs' },
  { value: 'calendar', label: 'Calendrier' },
];

export interface ActivityFilterBarProps {
  filters: AuditActivityFilter;
  onFiltersChange: (filters: AuditActivityFilter) => void;
}

export function ActivityFilterBar({ 
  filters, 
  onFiltersChange,
}: ActivityFilterBarProps) {
  const { eventTypes } = useAuditEventTypes();

  const handleFilterChange = (key: keyof AuditActivityFilter, value: any) => {
    let processedValue = value;
    
    // Convert to BigInt for date and pagination fields
    if (value !== undefined && value !== null) {
      if (['start_date', 'end_date', 'limit', 'offset'].includes(key)) {
        processedValue = BigInt(value);
      }
    } else {
      processedValue = null;
    }

    onFiltersChange({
      ...filters,
      [key]: processedValue,
      offset: 0n, // Reset to first page on filter change (BigInt)
    });
  };

  const clearFilters = () => {
    onFiltersChange({ 
      user_id: null,
      event_type: null,
      resource_type: null,
      start_date: null,
      end_date: null,
      limit: filters.limit, 
      offset: 0n 
    });
  };

  const hasActiveFilters = !!(filters.user_id || filters.event_type || filters.resource_type || filters.start_date || filters.end_date);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))] shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="user-id" className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Search className="h-3 w-3" /> Utilisateur (ID)
          </Label>
          <Input
            id="user-id"
            placeholder="ID utilisateur..."
            value={filters.user_id ?? ''}
            onChange={(e) => handleFilterChange('user_id', e.target.value || null)}
            className="h-9 bg-background/50 focus-visible:ring-[hsl(var(--rpma-teal))]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-type" className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3 w-3" /> Type d&apos;événement
          </Label>
          <Select
            value={filters.event_type ?? 'all'}
            onValueChange={(value) => handleFilterChange('event_type', value === 'all' ? null : value)}
          >
            <SelectTrigger id="event-type" className="h-9 bg-background/50 focus:ring-[hsl(var(--rpma-teal))]">
              <SelectValue placeholder="Tous les événements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les événements</SelectItem>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatEventType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="resource-type" className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3 w-3" /> Type de ressource
          </Label>
          <Select
            value={filters.resource_type ?? 'all'}
            onValueChange={(value) => handleFilterChange('resource_type', value === 'all' ? null : value)}
          >
            <SelectTrigger id="resource-type" className="h-9 bg-background/50 focus:ring-[hsl(var(--rpma-teal))]">
              <SelectValue placeholder="Toutes les ressources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les ressources</SelectItem>
              {RESOURCE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="start-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date de début</Label>
          <Input
            id="start-date"
            type="date"
            value={filters.start_date ? new Date(Number(filters.start_date)).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFilterChange('start_date', e.target.value ? new Date(e.target.value).getTime() : null)}
            className="h-9 bg-background/50 focus-visible:ring-[hsl(var(--rpma-teal))]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="end-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date de fin</Label>
          <Input
            id="end-date"
            type="date"
            value={filters.end_date ? new Date(Number(filters.end_date)).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFilterChange('end_date', e.target.value ? new Date(e.target.value).getTime() : null)}
            className="h-9 bg-background/50 focus-visible:ring-[hsl(var(--rpma-teal))]"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-red-500 hover:bg-red-50"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}

function formatEventType(type: string): string {
  return type
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
}
