'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext } from '@hello-pangea/dnd';
import { CalendarHeader } from '@/domains/calendar';
import { QuickAddDialog, FilterDrawer } from '@/domains/tasks';
import { MonthView } from '@/domains/calendar/components/MonthView';
import { WeekView } from '@/domains/calendar/components/WeekView';
import { DayView } from '@/domains/calendar/components/DayView';
import { AgendaView } from '@/domains/calendar/components/AgendaView';
import { useCalendarStore } from '@/domains/calendar/stores/calendarStore';
import { useCalendar } from '@/domains/calendar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function CalendarDashboard() {
  const router = useRouter();
  const {
    currentView,
    currentDate,
    isFilterDrawerOpen,
    isQuickAddOpen,
    toggleFilterDrawer,
    toggleQuickAdd,
    setCurrentView,
    setCurrentDate,
    goToToday,
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
    // Drag-and-drop rescheduling is not yet implemented
  };

  const handleTaskClick = useCallback((task: { id: string }) => {
    router.push(`/tasks/${task.id}`);
  }, [router]);

  const renderView = () => {
    switch (currentView) {
      case 'month':
        return (
          <MonthView
            tasks={tasks}
            currentDate={currentDate}
            onTaskClick={handleTaskClick}
            className="h-full"
          />
        );
      case 'week':
        return (
          <DragDropContext onDragEnd={handleDragEnd}>
            <WeekView
              tasks={tasks}
              currentDate={currentDate}
              onTaskClick={handleTaskClick}
              className="h-full"
            />
          </DragDropContext>
        );
      case 'day':
        return (
          <DragDropContext onDragEnd={handleDragEnd}>
            <DayView
              tasks={tasks}
              currentDate={currentDate}
              onTaskClick={handleTaskClick}
              className="h-full"
            />
          </DragDropContext>
        );
      case 'agenda':
        return (
          <AgendaView
            tasks={tasks}
            currentDate={currentDate}
            onTaskClick={handleTaskClick}
            className="h-full"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="flex-shrink-0 mb-4">
        <CalendarHeader
          currentDate={currentDate}
          viewMode={currentView}
          onDateChange={setCurrentDate}
          onViewModeChange={setCurrentView}
          onTodayClick={goToToday}
        />
      </div>

      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-teal))]" />
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
