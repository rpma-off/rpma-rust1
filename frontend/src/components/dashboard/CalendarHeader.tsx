'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter, List, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import { designTokens } from '@/lib/design-tokens';

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

  // Mock monthly revenue - in production this would be calculated from actual data
  const monthlyRevenue = useMemo(() => {
    const monthName = format(currentDate, 'MMMM', { locale: fr });
    // This would be replaced with actual revenue calculation
    const revenue = 0;
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${revenue.toFixed(2).replace('.', ',')} $`;
  }, [currentDate]);

  return (
    <div className="border-b border-border/20 bg-background">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-foreground">
            {currentView === 'week' ? 'CALENDRIER' : format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h1>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={goToPrevious}
              className="border-border/60"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={goToToday}
              aria-label="Aller à aujourd'hui"
            >
              AUJOURD&apos;HUI
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={goToNext}
              className="border-border/60"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleFilterDrawer}
            className="gap-2"
            aria-label={`Filtres${activeFilterCount > 0 ? ` (${activeFilterCount} actifs)` : ''}`}
          >
            <Filter className="h-4 w-4" />
            FILTRE
            {activeFilterCount > 0 && (
              <span className="ml-1 h-5 px-1.5 text-xs rounded-full bg-accent text-white" aria-label={`${activeFilterCount} filtres actifs`}>
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            aria-label="Citations"
            title="Citations (Devis)"
          >
            <FileText className="h-4 w-4" />
            CITATIONS
          </Button>

          <div className="h-6 w-px bg-border mx-2" />

          <div className="text-sm font-semibold text-foreground">
            {monthlyRevenue}
          </div>
        </div>
      </div>

      {filterChips.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-2 border-t border-border/10 flex-wrap">
          {filterChips.map((chip) => (
            <div
              key={chip.key}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-foreground text-sm"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-1 hover:text-accent transition-colors"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-2 flex items-center gap-3 border-t border-border/10">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1" role="group" aria-label="Mode d'affichage">
          <Button
            size="sm"
            variant={currentView === 'month' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('month')}
            className={currentView === 'month' ? 'bg-accent text-white' : ''}
            aria-label="Vue mensuelle"
          >
            Mois
          </Button>
          <Button
            size="sm"
            variant={currentView === 'week' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('week')}
            className={currentView === 'week' ? 'bg-accent text-white' : ''}
            aria-label="Vue hebdomadaire"
          >
            Semaine
          </Button>
          <Button
            size="sm"
            variant={currentView === 'day' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('day')}
            className={currentView === 'day' ? 'bg-accent text-white' : ''}
            aria-label="Vue journalière"
          >
            Jour
          </Button>
          <Button
            size="sm"
            variant={currentView === 'agenda' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('agenda')}
            className={currentView === 'agenda' ? 'bg-accent text-white' : ''}
            aria-label="Vue agenda"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={filters.technicianId || 'all'}
          onValueChange={(value) =>
            setFilters({ technicianId: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Attribué" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="unassigned">Non assigné</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setFilters({ showMyEventsOnly: !filters.showMyEventsOnly })}
          className={filters.showMyEventsOnly ? 'bg-accent text-white' : ''}
        >
          {filters.showMyEventsOnly ? 'Éléments de ligne' : 'Dans l\'ensemble'}
        </Button>
      </div>
    </div>
  );
}
