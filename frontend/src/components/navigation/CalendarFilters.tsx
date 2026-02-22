'use client';

import { useState } from 'react';
import { useCalendarStore } from '@/domains/calendar/stores/calendarStore';
import { useAuth } from '@/domains/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  Calendar, 
  Users, 
  Filter, 
  X,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority } from '@/lib/backend';

interface CalendarFiltersProps {
  className?: string;
}

export function CalendarFilters({ className }: CalendarFiltersProps) {
  const { user } = useAuth();
  const {
    currentView: _currentView,
    currentDate: _currentDate,
    filters,
    setFilters,
    resetFilters
  } = useCalendarStore();

  // Local state for search since it's not in the calendar store
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for event types (meeting types)
  const [eventTypes, setEventTypes] = useState({
    all: true,
    with_meeting: false,
    without_meeting: false
  });

  // Local state for participants
  const [participants, setParticipants] = useState({
    all: true,
    with_participants: false,
    without_participants: false
  });

  const [expandedSections, setExpandedSections] = useState({
    search: true,
    eventType: true,
    participants: true,
    dateRange: true,
    status: true,
    priority: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEventTypeChange = (type: keyof typeof eventTypes, checked: boolean) => {
    if (type === 'all') {
      setEventTypes({
        all: checked,
        with_meeting: false,
        without_meeting: false
      });
    } else {
      setEventTypes(prev => ({
        ...prev,
        [type]: checked,
        all: false
      }));
    }
  };

  const handleParticipantChange = (type: keyof typeof participants, checked: boolean) => {
    if (type === 'all') {
      setParticipants({
        all: checked,
        with_participants: false,
        without_participants: false
      });
    } else {
      setParticipants(prev => ({
        ...prev,
        [type]: checked,
        all: false
      }));
    }
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
    setEventTypes({
      all: true,
      with_meeting: false,
      without_meeting: false
    });
    setParticipants({
      all: true,
      with_participants: false,
      without_participants: false
    });
    resetFilters();
  };

  const hasActiveFilters = searchQuery || 
    !eventTypes.all || 
    !participants.all ||
    (filters.statuses && filters.statuses.length > 0) ||
    (filters.priorities && filters.priorities.length > 0) ||
    filters.showMyEventsOnly;

  const eventTypeOptions = [
    { id: 'all' as const, label: 'Tous les types' },
    { id: 'with_meeting' as const, label: 'Avec rendez-vous' },
    { id: 'without_meeting' as const, label: 'Sans rendez-vous' }
  ];

  const participantOptions = [
    { id: 'all' as const, label: 'Tous les participants' },
    { id: 'with_participants' as const, label: 'Avec participants' },
    { id: 'without_participants' as const, label: 'Sans participants' }
  ];

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
                {statusOptions.find(s => s.id === status)?.label || status}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => handleStatusChange(status, false)}
                />
              </Badge>
            ))}
            {filters.priorities?.map(priority => (
              <Badge key={priority} variant="secondary" className="text-xs">
                {priorityOptions.find(p => p.id === priority)?.label || priority}
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
          {eventTypeOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={option.id}
                checked={eventTypes[option.id] || false}
                onCheckedChange={(checked) => 
                  handleEventTypeChange(option.id, checked as boolean)
                }
              />
              <Label 
                htmlFor={option.id}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
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
          {participantOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={option.id}
                checked={participants[option.id] || false}
                onCheckedChange={(checked) => 
                  handleParticipantChange(option.id, checked as boolean)
                }
              />
              <Label 
                htmlFor={option.id}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
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
                value={filters.dateRange?.start ? new Date(filters.dateRange.start).toISOString().split('T')[0] : ''}
                onChange={(e) => setFilters({ 
                  dateRange: filters.dateRange 
                    ? { ...filters.dateRange, start: new Date(e.target.value) }
                    : { start: new Date(e.target.value), end: new Date() }
                })}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-sm">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.dateRange?.end ? new Date(filters.dateRange.end).toISOString().split('T')[0] : ''}
                onChange={(e) => setFilters({ 
                  dateRange: filters.dateRange 
                    ? { ...filters.dateRange, end: new Date(e.target.value) }
                    : { start: new Date(), end: new Date(e.target.value) }
                })}
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
