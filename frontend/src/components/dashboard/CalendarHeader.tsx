'use client';

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, Filter, List, X, Calendar as CalendarIcon, Grid3X3, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendarStore } from '@/lib/stores/calendarStore';

export function CalendarHeader() {
  const {
    currentDate,
    currentView,
    filters,
    toggleFilterDrawer,
    goToPrevious,
    goToNext,
    goToToday,
    setCurrentView,
    setFilters,
  } = useCalendarStore();

  const activeFilterCount = React.useMemo(() => {
    return [
      filters.technicianId,
      filters.statuses.length,
      filters.priorities.length,
      filters.clientId,
      filters.interventionTypes.length,
      filters.dateRange,
      filters.showMyEventsOnly,
    ].filter(Boolean).length;
  }, [filters]);

  const filterChips = React.useMemo(() => {
    const chips: Array<{
      key: string;
      label: string;
      onRemove: () => void;
    }> = [];

    if (filters.technicianId) {
      chips.push({
        key: 'technician',
        label: `Technician: ${filters.technicianId}`,
        onRemove: () => setFilters({ technicianId: null }),
      });
    }

    if (filters.statuses.length > 0) {
      chips.push({
        key: 'status',
        label: `Status: ${filters.statuses.length}`,
        onRemove: () => setFilters({ statuses: [] }),
      });
    }

    if (filters.priorities.length > 0) {
      chips.push({
        key: 'priority',
        label: `Priority: ${filters.priorities.length}`,
        onRemove: () => setFilters({ priorities: [] }),
      });
    }

    if (filters.clientId) {
      chips.push({
        key: 'client',
        label: `Client: ${filters.clientId}`,
        onRemove: () => setFilters({ clientId: null }),
      });
    }

    if (filters.interventionTypes.length > 0) {
      chips.push({
        key: 'type',
        label: `Type: ${filters.interventionTypes.length}`,
        onRemove: () => setFilters({ interventionTypes: [] }),
      });
    }

    if (filters.dateRange) {
      const start = format(filters.dateRange.start, 'dd/MM/yyyy');
      const end = format(filters.dateRange.end, 'dd/MM/yyyy');
      chips.push({
        key: 'dateRange',
        label: `Date: ${start} - ${end}`,
        onRemove: () => setFilters({ dateRange: null }),
      });
    }

    if (filters.showMyEventsOnly) {
      chips.push({
        key: 'myEvents',
        label: 'My events only',
        onRemove: () => setFilters({ showMyEventsOnly: false }),
      });
    }

    return chips;
  }, [filters, setFilters]);

  // Monthly revenue intentionally omitted from the new header layout

  return (
    <div className="rpma-shell">
      <div className="px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </h1>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={toggleFilterDrawer}
            className="gap-2 rounded-[6px]"
            aria-label={`Filtres${activeFilterCount > 0 ? ` (${activeFilterCount} actifs)` : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filtre
            {activeFilterCount > 0 && (
              <span className="ml-1 h-5 px-1.5 text-xs rounded-full bg-[hsl(var(--rpma-teal))] text-white" aria-label={`${activeFilterCount} filtres actifs`}>
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={goToPrevious}
              className="h-8 w-8 p-0 rounded-full"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={goToToday}
              className="rounded-[6px]"
            >
              Aujourd&apos;hui
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={goToNext}
              className="h-8 w-8 p-0 rounded-full"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 border border-border/60 rounded-full p-1 bg-muted/30">
            <Button
              size="sm"
              variant={currentView === 'agenda' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('agenda')}
              className={currentView === 'agenda' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
            >
              <List className="h-4 w-4 mr-1" />
              Agenda
            </Button>
            <Button
              size="sm"
              variant={currentView === 'month' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('month')}
              className={currentView === 'month' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Mois
            </Button>
            <Button
              size="sm"
              variant={currentView === 'week' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('week')}
              className={currentView === 'week' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Semaine
            </Button>
            <Button
              size="sm"
              variant={currentView === 'day' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('day')}
              className={currentView === 'day' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
            >
              <Clock className="h-4 w-4 mr-1" />
              Jour
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full opacity-40 cursor-not-allowed"
              aria-disabled="true"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Carte
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">Assigné :</div>
            <Select
              value={filters.technicianId || 'all'}
              onValueChange={(value) =>
                setFilters({ technicianId: value === 'all' ? null : value })
              }
            >
              <SelectTrigger className="h-8 w-36 rounded-full border-border/60">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unassigned">Non assigné</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 border border-border/60 rounded-full p-1 bg-muted/30">
            <Button
              size="sm"
              variant={!filters.showMyEventsOnly ? 'default' : 'ghost'}
              onClick={() => setFilters({ showMyEventsOnly: false })}
              className={!filters.showMyEventsOnly ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
            >
              Dans l&apos;ensemble
            </Button>
            <Button
              size="sm"
              variant={filters.showMyEventsOnly ? 'default' : 'ghost'}
              onClick={() => setFilters({ showMyEventsOnly: true })}
              className={filters.showMyEventsOnly ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
            >
              Éléments de ligne
            </Button>
          </div>
        </div>
      </div>

      {filterChips.length > 0 && (
        <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
          {filterChips.map((chip) => (
            <div
              key={chip.key}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] text-foreground text-sm"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-1 hover:text-[hsl(var(--rpma-teal))] transition-colors"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
