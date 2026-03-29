'use client';

import { useState } from 'react';
import { Calendar, Users, Filter, X, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority } from '@/lib/backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/shared/hooks/useAuth';
import { useCalendarStore } from '../stores/calendarStore';
import {
  EVENT_TYPE_OPTIONS,
  INITIAL_EVENT_TYPE_FILTERS,
  INITIAL_EXPANDED_SECTIONS,
  INITIAL_PARTICIPANT_FILTERS,
  PARTICIPANT_OPTIONS,
  PRIORITY_OPTIONS as CALENDAR_PRIORITY_OPTIONS,
  STATUS_OPTIONS as CALENDAR_STATUS_OPTIONS,
  toDateInputValue,
  updateExclusiveFilterState,
  withEndDate,
  withStartDate,
} from './calendarFilterConfig';

interface CalendarFiltersProps {
  className?: string;
}

function FilterOptionList<T extends string>({
  options,
  checkedValues,
  getId,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  checkedValues: Record<string, boolean>;
  getId?: (value: T) => string;
  onChange: (value: T, checked: boolean) => void;
}) {
  return (
    <>
      {options.map((option) => {
        const checkboxId = getId ? getId(option.id) : option.id;

        return (
          <div key={option.id} className="flex items-center space-x-2">
            <Checkbox
              id={checkboxId}
              checked={checkedValues[option.id] || false}
              onCheckedChange={(checked) => onChange(option.id, checked === true)}
            />
            <Label htmlFor={checkboxId} className="text-sm font-normal cursor-pointer">
              {option.label}
            </Label>
          </div>
        );
      })}
    </>
  );
}

export function CalendarFilters({ className }: CalendarFiltersProps) {
  const { user } = useAuth();
  const filters = useCalendarStore((state) => state.filters);
  const setFilters = useCalendarStore((state) => state.setFilters);
  const resetFilters = useCalendarStore((state) => state.resetFilters);

  // Local state for search since it's not in the calendar store
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for event types (meeting types)
  const [eventTypes, setEventTypes] = useState(INITIAL_EVENT_TYPE_FILTERS);

  // Local state for participants
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANT_FILTERS);

  const [expandedSections, setExpandedSections] = useState(INITIAL_EXPANDED_SECTIONS);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEventTypeChange = (type: keyof typeof eventTypes, checked: boolean) => {
    setEventTypes((prev) => updateExclusiveFilterState(prev, type, checked));
  };

  const handleParticipantChange = (type: keyof typeof participants, checked: boolean) => {
    setParticipants((prev) => updateExclusiveFilterState(prev, type, checked));
  };

  const handleStatusChange = (status: TaskStatus, checked: boolean) => {
    const currentStatuses = filters.statuses || [];
    if (checked) {
      setFilters({ statuses: [...currentStatuses, status] });
    } else {
      setFilters({ statuses: currentStatuses.filter(s => s !== status) });
    }
  };

  const handlePriorityChange = (priority: TaskPriority, checked: boolean) => {
    const currentPriorities = filters.priorities || [];
    if (checked) {
      setFilters({ priorities: [...currentPriorities, priority] });
    } else {
      setFilters({ priorities: currentPriorities.filter(p => p !== priority) });
    }
  };

  const handleMyEventsOnlyChange = (checked: boolean) => {
    setFilters({ 
      showMyEventsOnly: checked,
      technicianId: checked && user?.id ? user.id : null
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setEventTypes(INITIAL_EVENT_TYPE_FILTERS);
    setParticipants(INITIAL_PARTICIPANT_FILTERS);
    resetFilters();
  };

  const hasActiveFilters = searchQuery || 
    !eventTypes.all || 
    !participants.all ||
    (filters.statuses && filters.statuses.length > 0) ||
    (filters.priorities && filters.priorities.length > 0) ||
    filters.showMyEventsOnly;


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
            {searchQuery && (
              <Badge variant="secondary" className="text-xs">
                Recherche: {searchQuery}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => setSearchQuery('')}
                />
              </Badge>
            )}
            {eventTypes.with_meeting && (
              <Badge variant="secondary" className="text-xs">
                Avec rendez-vous
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleEventTypeChange('with_meeting', false)}
                />
              </Badge>
            )}
            {eventTypes.without_meeting && (
              <Badge variant="secondary" className="text-xs">
                Sans rendez-vous
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleEventTypeChange('without_meeting', false)}
                />
              </Badge>
            )}
            {participants.with_participants && (
              <Badge variant="secondary" className="text-xs">
                Avec participants
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleParticipantChange('with_participants', false)}
                />
              </Badge>
            )}
            {participants.without_participants && (
              <Badge variant="secondary" className="text-xs">
                Sans participants
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleParticipantChange('without_participants', false)}
                />
              </Badge>
            )}
            {filters.showMyEventsOnly && (
              <Badge variant="secondary" className="text-xs">
                Mes événements uniquement
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleMyEventsOnlyChange(false)}
                />
              </Badge>
            )}
            {filters.statuses?.map(status => (
              <Badge key={status} variant="secondary" className="text-xs">
                {CALENDAR_STATUS_OPTIONS.find(s => s.id === status)?.label || status}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleStatusChange(status, false)}
                />
              </Badge>
            ))}
            {filters.priorities?.map(priority => (
              <Badge key={priority} variant="secondary" className="text-xs">
                {CALENDAR_PRIORITY_OPTIONS.find(p => p.id === priority)?.label || priority}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handlePriorityChange(priority, false)}
                />
              </Badge>
            ))}
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
        <CollapsibleContent className="space-y-2 pb-2">
          <Input
            placeholder="Rechercher des événements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Event Type Section */}
      <Collapsible
        open={expandedSections.eventType}
        onOpenChange={() => toggleSection('eventType')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Type d&apos;événement</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.eventType && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pb-2">
          <FilterOptionList
            options={EVENT_TYPE_OPTIONS}
            checkedValues={eventTypes}
            onChange={handleEventTypeChange}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Participants Section */}
      <Collapsible
        open={expandedSections.participants}
        onOpenChange={() => toggleSection('participants')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium cursor-pointer">Participants</Label>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expandedSections.participants && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pb-2">
          <FilterOptionList
            options={PARTICIPANT_OPTIONS}
            checkedValues={participants}
            onChange={handleParticipantChange}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Date Range Section */}
      <Collapsible
        open={expandedSections.dateRange}
        onOpenChange={() => toggleSection('dateRange')}
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
                expandedSections.dateRange && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pb-2">
          <div className="space-y-2">
            <div>
              <Label htmlFor="start-date" className="text-sm">Date de début</Label>
              <Input
                id="start-date"
                type="date"
                value={toDateInputValue(filters.dateRange?.start)}
                onChange={(e) => setFilters({ dateRange: withStartDate(filters.dateRange?.end, e.target.value) })}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-sm">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={toDateInputValue(filters.dateRange?.end)}
                onChange={(e) => setFilters({ dateRange: withEndDate(filters.dateRange?.start, e.target.value) })}
                className="text-sm"
              />
            </div>
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
                checked={filters.statuses?.includes(option.id) || false}
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
                checked={filters.priorities?.includes(option.id) || false}
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

      {/* Additional Options */}
      <Separator />
      
      <div className="space-y-3">
        <Label className="text-sm font-medium">Options d&apos;affichage</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="show-my-events-only" 
            checked={filters.showMyEventsOnly || false}
            onCheckedChange={handleMyEventsOnlyChange}
          />
          <Label 
            htmlFor="show-my-events-only"
            className="text-sm font-normal cursor-pointer"
          >
            Afficher uniquement mes événements
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="hide-cancelled"
            checked={!filters.statuses?.includes('cancelled')}
            onCheckedChange={(checked) => {
              if (checked) {
                setFilters({ 
                  statuses: (filters.statuses || []).filter(s => s !== 'cancelled')
                });
              } else {
                setFilters({ 
                  statuses: [...(filters.statuses || []), 'cancelled']
                });
              }
            }}
          />
          <Label 
            htmlFor="hide-cancelled"
            className="text-sm font-normal cursor-pointer"
          >
            Masquer les événements annulés
          </Label>
        </div>
      </div>
    </div>
  );
}
