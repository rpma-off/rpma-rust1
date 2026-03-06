import React from 'react';
import { Search, Calendar, Download, Upload, Grid, List } from 'lucide-react';
import {
  Button,
  Input,
} from '@/shared/ui/facade';

interface TaskListFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  technicianFilter: string;
  setTechnicianFilter: (tech: string) => void;
  ppfZoneFilter: string;
  setPpfZoneFilter: (zone: string) => void;
  technicians: Array<{ id: string; name: string }>;
  viewMode: 'cards' | 'table' | 'calendar' | 'kanban';
  setViewMode: (mode: 'cards' | 'table' | 'calendar' | 'kanban') => void;
  onExport: () => void;
  onImport: () => void;
}

export const TaskListFilters = React.memo(({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  technicianFilter,
  setTechnicianFilter,
  ppfZoneFilter,
  setPpfZoneFilter,
  technicians,
  viewMode,
  setViewMode,
  onExport,
  onImport
}: TaskListFiltersProps) => {
  const activeFiltersCount = [statusFilter, dateFilter, technicianFilter, ppfZoneFilter].filter(f => f !== 'all').length;

  return (
    <div className="animate-fadeIn bg-white border border-[hsl(var(--rpma-border))] rounded-[10px] p-4 mb-4 shadow-[var(--rpma-shadow-soft)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher tâches, véhicules, clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 rounded-full bg-muted/30 border-border"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border border-border/60 rounded-full p-1 bg-muted/20">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
                title="Vue liste"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
                title="Vue cartes"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
                title="Vue calendrier"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={viewMode === 'kanban' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
                title="Vue Kanban"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onImport}
              className="rounded-full border-border/60"
              title="Importer"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 h-9 bg-white border border-border/60 rounded-full text-foreground text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Devis</option>
            <option value="scheduled">Planifié</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
            <option value="archived">Archivé</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 h-9 bg-white border border-border/60 rounded-full text-foreground text-sm"
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd&apos;hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="overdue">En retard</option>
          </select>

          <select
            value={technicianFilter}
            onChange={(e) => setTechnicianFilter(e.target.value)}
            className="px-3 h-9 bg-white border border-border/60 rounded-full text-foreground text-sm"
          >
            <option value="all">Tous les techniciens</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Zone PPF"
            value={ppfZoneFilter === 'all' ? '' : ppfZoneFilter}
            onChange={(e) => setPpfZoneFilter(e.target.value || 'all')}
            className="px-3 h-9 bg-white border border-border/60 rounded-full text-foreground text-sm placeholder-muted-foreground"
          />

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('all');
                setTechnicianFilter('all');
                setPpfZoneFilter('all');
                setSearchTerm('');
              }}
              className="text-muted-foreground"
            >
              Réinitialiser
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="rounded-full border-border/60"
            title="Exporter"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
});

TaskListFilters.displayName = 'TaskListFilters';
