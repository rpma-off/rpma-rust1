'use client';

import React, { useState } from 'react';
import { X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import { designTokens } from '@/lib/design-tokens';
import type { TaskStatus, TaskPriority } from '@/lib/backend';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterDrawer({ isOpen, onClose }: FilterDrawerProps) {
  const { filters, setFilters, resetFilters } = useCalendarStore();

  const [statusExpanded, setStatusExpanded] = useState(true);
  const [priorityExpanded, setPriorityExpanded] = useState(true);
  const [typeExpanded, setTypeExpanded] = useState(true);
  const [clientExpanded, setClientExpanded] = useState(true);
  const [dateRangeExpanded, setDateRangeExpanded] = useState(true);

  const [dateRange, setDateRange] = useState({
    start: filters.dateRange?.start || null,
    end: filters.dateRange?.end || null,
  });

  const allStatuses: TaskStatus[] = ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'];
  const allPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  const interventionTypes = ['PPF', 'Céramique', 'Detailing', 'Autre'];

  const handleStatusChange = (status: TaskStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    setFilters({ statuses: newStatuses });
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    setFilters({ priorities: newPriorities });
  };

  const handleInterventionTypeChange = (type: string) => {
    const newTypes = filters.interventionTypes.includes(type)
      ? filters.interventionTypes.filter(t => t !== type)
      : [...filters.interventionTypes, type];
    setFilters({ interventionTypes: newTypes });
  };

  const handleDateRangeChange = () => {
    if (dateRange.start && dateRange.end) {
      setFilters({
        dateRange: {
          start: dateRange.start!,
          end: dateRange.end!,
        },
      });
    }
  };

  const handleClearDateRange = () => {
    setDateRange({ start: null, end: null });
    setFilters({ dateRange: null });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[360px]">
        <SheetHeader>
          <SheetTitle>Filtres avancés</SheetTitle>
          <SheetDescription>
            Appliquez des filtres pour affiner votre recherche
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <Collapsible open={statusExpanded} onOpenChange={setStatusExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer">
              <span className="text-sm font-medium">Statut</span>
              {statusExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-3">
              <div className="space-y-2">
                {allStatuses.map((status) => (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filters.statuses.includes(status)}
                      onCheckedChange={() => handleStatusChange(status)}
                    />
                    <label
                      htmlFor={`status-${status}`}
                      className="text-sm text-foreground cursor-pointer"
                    >
                      {status === 'draft' && 'Brouillon'}
                      {status === 'scheduled' && 'Planifié'}
                      {status === 'in_progress' && 'En cours'}
                      {status === 'completed' && 'Terminé'}
                      {status === 'cancelled' && 'Annulé'}
                    </label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={priorityExpanded} onOpenChange={setPriorityExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer">
              <span className="text-sm font-medium">Priorité</span>
              {priorityExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-3">
              <div className="space-y-2">
                {allPriorities.map((priority) => (
                  <div key={priority} className="flex items-center gap-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={filters.priorities.includes(priority)}
                      onCheckedChange={() => handlePriorityChange(priority)}
                    />
                    <label
                      htmlFor={`priority-${priority}`}
                      className="text-sm text-foreground cursor-pointer"
                    >
                      {priority === 'low' && 'Basse'}
                      {priority === 'medium' && 'Moyenne'}
                      {priority === 'high' && 'Haute'}
                      {priority === 'urgent' && 'Urgente'}
                    </label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={typeExpanded} onOpenChange={setTypeExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer">
              <span className="text-sm font-medium">Type d&apos;intervention</span>
              {typeExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-3">
              <div className="space-y-2">
                {interventionTypes.map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.interventionTypes.includes(type)}
                      onCheckedChange={() => handleInterventionTypeChange(type)}
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="text-sm text-foreground cursor-pointer"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={clientExpanded} onOpenChange={setClientExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer">
              <span className="text-sm font-medium">Client</span>
              {clientExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-3">
              <Input
                placeholder="Rechercher client..."
                value={filters.clientId || ''}
                onChange={(e) => setFilters({ clientId: e.target.value || null })}
              />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={dateRangeExpanded} onOpenChange={setDateRangeExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer">
              <span className="text-sm font-medium">Plage de dates</span>
              {dateRangeExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-3">
              <div className="space-y-2">
                <div className="space-y-2">
                  <Input
                    type="date"
                    placeholder="Date début"
                    value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        start: e.target.value ? new Date(e.target.value) : null,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    placeholder="Date fin"
                    value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        end: e.target.value ? new Date(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                {(dateRange.start || dateRange.end) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearDateRange}
                    className="w-full justify-start"
                  >
                    Effacer la plage de dates
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetFilters();
              setDateRange({ start: null, end: null });
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            onClick={() => {
              handleDateRangeChange();
              onClose();
            }}
            style={{ backgroundColor: designTokens.colors.primary }}
          >
            Appliquer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
