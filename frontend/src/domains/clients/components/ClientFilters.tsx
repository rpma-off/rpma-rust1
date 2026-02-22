'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronDown, 
  Search,
  Users,
  Filter,
  X,
  Star,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientFiltersProps {
  className?: string;
  onFiltersChange?: (filters: ClientFilters) => void;
}

interface ClientFilters {
  searchQuery: string;
  customerType: 'all' | 'individual' | 'business';
  status: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'created_at' | 'total_tasks' | 'last_activity';
  sortOrder: 'asc' | 'desc';
  hasActiveTasks: boolean;
  highValue: boolean;
  recentlyAdded: boolean;
}

export function ClientFilters({ className, onFiltersChange }: ClientFiltersProps) {
  const [filters, setFilters] = useState<ClientFilters>({
    searchQuery: '',
    customerType: 'all',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    hasActiveTasks: false,
    highValue: false,
    recentlyAdded: false
  });

  const [expandedSections, setExpandedSections] = useState({
    search: true,
    customerType: true,
    status: true,
    sort: true,
    additional: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilter = (key: keyof ClientFilters, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      searchQuery: '',
      customerType: 'all' as const,
      status: 'all' as const,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      hasActiveTasks: false,
      highValue: false,
      recentlyAdded: false
    };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const hasActiveFilters = filters.searchQuery || 
    filters.customerType !== 'all' ||
    filters.status !== 'all' ||
    filters.hasActiveTasks ||
    filters.highValue ||
    filters.recentlyAdded;

  const customerTypeOptions = [
    { value: 'all', label: 'Tous les types' },
    { value: 'individual', label: 'Particulier' },
    { value: 'business', label: 'Entreprise' }
  ];

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Nom' },
    { value: 'created_at', label: 'Date de création' },
    { value: 'total_tasks', label: 'Nombre de tâches' },
    { value: 'last_activity', label: 'Dernière activité' }
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Filtres actifs</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs h-auto p-1 text-gray-500 hover:text-red-600"
            >
              Effacer tout
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.searchQuery && (
              <Badge variant="secondary" className="text-xs">
                Recherche: {filters.searchQuery}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('searchQuery', '')}
                />
              </Badge>
            )}
            {filters.customerType !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Type: {customerTypeOptions.find(t => t.value === filters.customerType)?.label}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('customerType', 'all')}
                />
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Statut: {statusOptions.find(s => s.value === filters.status)?.label}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('status', 'all')}
                />
              </Badge>
            )}
            {filters.hasActiveTasks && (
              <Badge variant="secondary" className="text-xs">
                Tâches actives
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('hasActiveTasks', false)}
                />
              </Badge>
            )}
            {filters.highValue && (
              <Badge variant="secondary" className="text-xs">
                Haute valeur
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('highValue', false)}
                />
              </Badge>
            )}
            {filters.recentlyAdded && (
              <Badge variant="secondary" className="text-xs">
                Ajouté récemment
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('recentlyAdded', false)}
                />
              </Badge>
            )}
          </div>
          <Separator />
        </div>
      )}

      {/* Search Section */}
      <Collapsible
        open={expandedSections.search}
        onOpenChange={() => toggleSection('search')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Recherche</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.search && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pb-2">
          <div>
            <Label htmlFor="client-search" className="text-xs text-gray-500">Rechercher des clients</Label>
            <Input
              id="client-search"
              placeholder="Nom, email, entreprise..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="text-sm"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Customer Type Section */}
      <Collapsible
        open={expandedSections.customerType}
        onOpenChange={() => toggleSection('customerType')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Type de client</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.customerType && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pb-2">
          <Select value={filters.customerType} onValueChange={(value: string) => updateFilter('customerType', value)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              {customerTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CollapsibleContent>
      </Collapsible>

      {/* Status Section */}
      <Collapsible
        open={expandedSections.status}
        onOpenChange={() => toggleSection('status')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Statut</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.status && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pb-2">
          <Select value={filters.status} onValueChange={(value: string) => updateFilter('status', value)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Sélectionner un statut" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CollapsibleContent>
      </Collapsible>

      {/* Sort Section */}
      <Collapsible
        open={expandedSections.sort}
        onOpenChange={() => toggleSection('sort')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Tri</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.sort && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pb-2">
          <div>
            <Label htmlFor="sort-by" className="text-xs text-gray-500">Trier par</Label>
            <Select value={filters.sortBy} onValueChange={(value: string) => updateFilter('sortBy', value)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sort-order" className="text-xs text-gray-500">Ordre</Label>
            <Select value={filters.sortOrder} onValueChange={(value: string) => updateFilter('sortOrder', value)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Croissant</SelectItem>
                <SelectItem value="desc">Décroissant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Additional Filters Section */}
      <Collapsible
        open={expandedSections.additional}
        onOpenChange={() => toggleSection('additional')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Filtres additionnels</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.additional && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pb-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="has-active-tasks" 
              checked={filters.hasActiveTasks}
              onCheckedChange={(checked) => updateFilter('hasActiveTasks', checked as boolean)}
            />
            <Label 
              htmlFor="has-active-tasks"
              className="text-sm font-normal cursor-pointer"
            >
              Avec tâches actives
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="high-value" 
              checked={filters.highValue}
              onCheckedChange={(checked) => updateFilter('highValue', checked as boolean)}
            />
            <Label 
              htmlFor="high-value"
              className="text-sm font-normal cursor-pointer"
            >
              Clients à haute valeur
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="recently-added" 
              checked={filters.recentlyAdded}
              onCheckedChange={(checked) => updateFilter('recentlyAdded', checked as boolean)}
            />
            <Label 
              htmlFor="recently-added"
              className="text-sm font-normal cursor-pointer"
            >
              Ajoutés récemment (30 jours)
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
