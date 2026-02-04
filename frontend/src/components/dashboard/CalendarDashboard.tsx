'use client';

import React, { useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { CalendarHeader } from './CalendarHeader';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { AgendaView } from '@/components/calendar/AgendaView';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import { useCalendar } from '@/hooks/useCalendar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EventDetailPopover } from './EventDetailPopover';
import { QuickAddDialog } from './QuickAddDialog';
import { FilterDrawer } from './FilterDrawer';

export function CalendarDashboard() {
  const {
    currentView,
    currentDate,
    isFilterDrawerOpen,
    isQuickAddOpen,
    toggleFilterDrawer,
    toggleQuickAdd,
  } = useCalendarStore();

  const { tasks, isLoading } = useCalendar(currentDate, currentView);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFilterDrawerOpen) toggleFilterDrawer();
        if (isQuickAddOpen) toggleQuickAdd();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleQuickAdd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterDrawerOpen, isQuickAddOpen, toggleFilterDrawer, toggleQuickAdd]);

  const handleDragEnd = () => {
    console.log('Drag end detected (not yet implemented)');
  };

  const renderView = () => {
    switch (currentView) {
      case 'month':
        return (
          <MonthView
            tasks={tasks}
            currentDate={currentDate}
            onTaskClick={(task) => console.log('Task clicked:', task.id)}
          />
        );
      case 'week':
        return (
          <DragDropContext onDragEnd={handleDragEnd}>
            <WeekView
              tasks={tasks}
              currentDate={currentDate}
              onTaskClick={(task) => console.log('Task clicked:', task.id)}
            />
          </DragDropContext>
        );
      case 'day':
        return (
          <DragDropContext onDragEnd={handleDragEnd}>
            <DayView
              tasks={tasks}
              currentDate={currentDate}
              onTaskClick={(task) => console.log('Task clicked:', task.id)}
            />
          </DragDropContext>
        );
      case 'agenda':
        return (
          <AgendaView
            tasks={tasks}
            currentDate={currentDate}
            onTaskClick={(task) => console.log('Task clicked:', task.id)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-62px)]">
      <div className="mb-4">
        <CalendarHeader />
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : (
          renderView()
        )}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <Button
          onClick={toggleQuickAdd}
          className="h-11 px-6 rounded-full shadow-[var(--rpma-shadow-soft)] bg-[hsl(var(--rpma-teal))] text-white hover:bg-[hsl(var(--rpma-teal))]/90"
          aria-label="Ajouter une nouvelle tâche"
        >
          <Plus className="h-5 w-5 mr-2" />
          + Add
        </Button>
      </div>

      <FilterDrawer isOpen={isFilterDrawerOpen} onClose={toggleFilterDrawer} />
      <QuickAddDialog isOpen={isQuickAddOpen} onClose={toggleQuickAdd} />
    </div>
  );
}
