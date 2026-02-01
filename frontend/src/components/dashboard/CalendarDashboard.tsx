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
import { designTokens } from '@/lib/design-tokens';
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
    <div className="flex flex-col h-screen bg-background">
      <CalendarHeader />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : (
          renderView()
        )}
      </div>

      <Button
        onClick={toggleQuickAdd}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        style={{
          backgroundColor: designTokens.colors.accent,
          color: 'white',
        }}
        aria-label="Ajouter une nouvelle tâche"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <FilterDrawer isOpen={isFilterDrawerOpen} onClose={toggleFilterDrawer} />
      <QuickAddDialog isOpen={isQuickAddOpen} onClose={toggleQuickAdd} />
    </div>
  );
}
