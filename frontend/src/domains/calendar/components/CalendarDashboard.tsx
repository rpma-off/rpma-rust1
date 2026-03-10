'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { CalendarHeader } from './CalendarHeader';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { useCalendarStore } from '../stores/calendarStore';
import { useCalendar } from '../hooks/useCalendar';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CalendarDashboard() {
  const router = useRouter();
  const currentView = useCalendarStore((state) => state.currentView);
  const currentDate = useCalendarStore((state) => state.currentDate);
  const setCurrentView = useCalendarStore((state) => state.setCurrentView);
  const setCurrentDate = useCalendarStore((state) => state.setCurrentDate);
  const goToToday = useCalendarStore((state) => state.goToToday);

  const { tasks, isLoading, rescheduleTaskWithConflictCheck } = useCalendar(currentDate, currentView);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const destinationId = result.destination.droppableId;

    // droppableId format: "day-{dateString}-slot-{timeSlot}" or "day-{dateString}-unscheduled"
    const daySlotMatch = destinationId.match(/^day-(\d{4}-\d{2}-\d{2})-slot-(\d{2}:\d{2})$/);
    const dayUnscheduledMatch = destinationId.match(/^day-(\d{4}-\d{2}-\d{2})-unscheduled$/);

    let newDate: string | undefined;
    let newStartTime: string | undefined;

    if (daySlotMatch) {
      newDate = daySlotMatch[1];
      newStartTime = daySlotMatch[2];
    } else if (dayUnscheduledMatch) {
      newDate = dayUnscheduledMatch[1];
    }

    if (!newDate) return;

    const task = tasks.find(t => t.id === taskId);
    const isSameDate = task?.scheduled_date === newDate;
    const isSameTime = task?.start_time === (newStartTime ?? null);
    if (isSameDate && isSameTime) return;

    setIsRescheduling(true);
    try {
      const rescheduleResult = await rescheduleTaskWithConflictCheck(taskId, newDate, newStartTime);

      if (rescheduleResult.success) {
        toast.success('Tâche replanifiée avec succès');
      } else {
        toast.error(rescheduleResult.error ?? 'Impossible de replanifier la tâche');
      }
    } finally {
      setIsRescheduling(false);
    }
  }, [tasks, rescheduleTaskWithConflictCheck]);

  const handleTaskClick = useCallback((task: { id: string }) => {
    router.push(`/tasks/${task.id}`);
  }, [router]);

  const handleCreateTask = useCallback(() => {
    router.push('/tasks/new');
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

      <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
        {isRescheduling && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-label="Replanification en cours"
          >
            <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 shadow-md border border-border">
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--rpma-teal))]" />
              <span className="text-sm font-medium text-foreground">Replanification en cours…</span>
            </div>
          </div>
        )}
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
          onClick={handleCreateTask}
          className="h-11 px-6 rounded-full shadow-[var(--rpma-shadow-soft)] bg-[hsl(var(--rpma-teal))] text-white hover:bg-[hsl(var(--rpma-teal))]/90"
          aria-label="Ajouter une nouvelle tache"
        >
          <Plus className="h-5 w-5 mr-2" />
          + Add
        </Button>
      </div>
    </div>
  );
}
