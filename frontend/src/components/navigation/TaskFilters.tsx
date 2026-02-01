'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/compatibility';
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
  Car,
  Users,
  Calendar,
  Filter,
  X,
  MapPin,
  Clock
} from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority } from '@/lib/backend';

interface TaskFiltersProps {
  className?: string;
  onFiltersChange?: (filters: TaskFilters) => void;
}

interface TaskFilters {
  searchQuery: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  technicianId: string | null;
  dateFilter: 'today' | 'week' | 'month' | 'overdue' | 'all';
  ppfZone: string;
  vehicleSearch: string;
  clientSearch: string;
  showMyTasksOnly: boolean;
}

export function TaskFilters({ className, onFiltersChange }: TaskFiltersProps) {
  const { user } = useAuth();
  
  const [filters, setFilters] = useState<TaskFilters>({
    searchQuery: '',
    statuses: [],
    priorities: [],
    technicianId: null,
    dateFilter: 'all',
    ppfZone: '',
    vehicleSearch: '',
    clientSearch: '',
    showMyTasksOnly: false
  });

  const [expandedSections, setExpandedSections] = useState({
    search: true,
    status: true,
    priority: true,
    technician: true,
    date: true,
    ppfZone: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilter = (key: keyof TaskFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleStatusChange = (status: TaskStatus, checked: boolean) => {
    const currentStatuses = filters.statuses || [];
    if (checked) {
      updateFilter('statuses', [...currentStatuses, status]);
    } else {
      updateFilter('statuses', currentStatuses.filter(s => s !== status));
    }
  };

  const handlePriorityChange = (priority: TaskPriority, checked: boolean) => {
    const currentPriorities = filters.priorities || [];
    if (checked) {
      updateFilter('priorities', [...currentPriorities, priority]);
    } else {
      updateFilter('priorities', currentPriorities.filter(p => p !== priority));
    }
  };

  const handleMyTasksOnlyChange = (checked: boolean) => {
    updateFilter('showMyTasksOnly', checked);
    updateFilter('technicianId', checked && user?.id ? user.id : null);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      searchQuery: '',
      statuses: [],
      priorities: [],
      technicianId: null,
      dateFilter: 'all' as const,
      ppfZone: '',
      vehicleSearch: '',
      clientSearch: '',
      showMyTasksOnly: false
    };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const hasActiveFilters = filters.searchQuery || 
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.dateFilter !== 'all' ||
    filters.ppfZone ||
    filters.vehicleSearch ||
    filters.clientSearch ||
    filters.showMyTasksOnly;

  const statusOptions: { id: TaskStatus; label: string }[] = [
    { id: 'pending', label: 'En attente' },
    { id: 'in_progress', label: 'En cours' },
    { id: 'completed', label: 'Terminé' },
    { id: 'cancelled', label: 'Annulé' }
  ];

  const priorityOptions: { id: TaskPriority; label: string }[] = [
    { id: 'low', label: 'Basse' },
    { id: 'medium', label: 'Moyenne' },
    { id: 'high', label: 'Haute' },
    { id: 'urgent', label: 'Urgente' }
  ];

  const dateFilterOptions = [
    { value: 'all', label: 'Toutes les dates' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'overdue', label: 'En retard' }
  ];

  const ppfZoneOptions = [
    { value: '', label: 'Toutes les zones' },
    { value: 'zone-1', label: 'Zone 1' },
    { value: 'zone-2', label: 'Zone 2' },
    { value: 'zone-3', label: 'Zone 3' },
    { value: 'zone-4', label: 'Zone 4' }
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
            {filters.statuses.map(status => (
              <Badge key={status} variant="secondary" className="text-xs">
                {statusOptions.find(s => s.id === status)?.label || status}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleStatusChange(status, false)}
                />
              </Badge>
            ))}
            {filters.priorities.map(priority => (
              <Badge key={priority} variant="secondary" className="text-xs">
                {priorityOptions.find(p => p.id === priority)?.label || priority}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handlePriorityChange(priority, false)}
                />
              </Badge>
            ))}
            {filters.dateFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {dateFilterOptions.find(d => d.value === filters.dateFilter)?.label}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('dateFilter', 'all')}
                />
              </Badge>
            )}
            {filters.ppfZone && (
              <Badge variant="secondary" className="text-xs">
                Zone: {filters.ppfZone}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('ppfZone', '')}
                />
              </Badge>
            )}
            {filters.vehicleSearch && (
              <Badge variant="secondary" className="text-xs">
                Véhicule: {filters.vehicleSearch}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('vehicleSearch', '')}
                />
              </Badge>
            )}
            {filters.clientSearch && (
              <Badge variant="secondary" className="text-xs">
                Client: {filters.clientSearch}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('clientSearch', '')}
                />
              </Badge>
            )}
            {filters.showMyTasksOnly && (
              <Badge variant="secondary" className="text-xs">
                Mes tâches uniquement
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleMyTasksOnlyChange(false)}
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
            <Label htmlFor="task-search" className="text-xs text-gray-500">Rechercher des tâches</Label>
            <Input
              id="task-search"
              placeholder="Titre, description..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="vehicle-search" className="text-xs text-gray-500">Véhicule</Label>
            <Input
              id="vehicle-search"
              placeholder="Marque, modèle..."
              value={filters.vehicleSearch}
              onChange={(e) => updateFilter('vehicleSearch', e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="client-search" className="text-xs text-gray-500">Client</Label>
            <Input
              id="client-search"
              placeholder="Nom, entreprise..."
              value={filters.clientSearch}
              onChange={(e) => updateFilter('clientSearch', e.target.value)}
              className="text-sm"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Status Filter Section */}
      <Collapsible
        open={expandedSections.status}
        onOpenChange={() => toggleSection('status')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
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
          {statusOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${option.id}`}
                checked={filters.statuses.includes(option.id)}
                onCheckedChange={(checked) => 
                  handleStatusChange(option.id, checked as boolean)
                }
              />
              <Label 
                htmlFor={`status-${option.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Priority Filter Section */}
      <Collapsible
        open={expandedSections.priority}
        onOpenChange={() => toggleSection('priority')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Priorité</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.priority && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pb-2">
          {priorityOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={`priority-${option.id}`}
                checked={filters.priorities.includes(option.id)}
                onCheckedChange={(checked) => 
                  handlePriorityChange(option.id, checked as boolean)
                }
              />
              <Label 
                htmlFor={`priority-${option.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Date Filter Section */}
      <Collapsible
        open={expandedSections.date}
        onOpenChange={() => toggleSection('date')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Période</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.date && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pb-2">
          <Select value={filters.dateFilter} onValueChange={(value: any) => updateFilter('dateFilter', value)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CollapsibleContent>
      </Collapsible>

      {/* PPF Zone Filter Section */}
      <Collapsible
        open={expandedSections.ppfZone}
        onOpenChange={() => toggleSection('ppfZone')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Zone PPF</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.ppfZone && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pb-2">
          <Select value={filters.ppfZone} onValueChange={(value) => updateFilter('ppfZone', value)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Sélectionner une zone" />
            </SelectTrigger>
            <SelectContent>
              {ppfZoneOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CollapsibleContent>
      </Collapsible>

      {/* Technician Filter Section */}
      {user?.role === 'admin' || user?.role === 'supervisor' ? (
        <Collapsible
          open={expandedSections.technician}
          onOpenChange={() => toggleSection('technician')}
        >
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium cursor-pointer">Technicien</Label>
              </div>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 text-gray-400 transition-transform",
                  expandedSections.technician && "rotate-180"
                )} 
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pb-2">
            <Select value={filters.technicianId || ''} onValueChange={(value) => updateFilter('technicianId', value || null)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Tous les techniciens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les techniciens</SelectItem>
                <SelectItem value="tech-1">Technicien 1</SelectItem>
                <SelectItem value="tech-2">Technicien 2</SelectItem>
                <SelectItem value="tech-3">Technicien 3</SelectItem>
              </SelectContent>
            </Select>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {/* Additional Options */}
      <Separator />
      
      <div className="space-y-3">
        <Label className="text-sm font-medium">Options d&apos;affichage</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="show-my-tasks-only" 
            checked={filters.showMyTasksOnly}
            onCheckedChange={handleMyTasksOnlyChange}
          />
          <Label 
            htmlFor="show-my-tasks-only"
            className="text-sm font-normal cursor-pointer"
          >
            Afficher uniquement mes tâches
          </Label>
        </div>
      </div>
    </div>
  );
}