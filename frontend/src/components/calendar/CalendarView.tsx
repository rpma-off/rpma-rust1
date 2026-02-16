import React from 'react';
import { toast } from 'sonner';
import { DragDropContext } from '@hello-pangea/dnd';
import { CalendarHeader } from './CalendarHeader';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { useCalendar } from '../../hooks/useCalendar';
import type { CalendarTask } from '../../lib/backend';
import { useTranslation } from '@/hooks/useTranslation';

interface CalendarViewProps {
  initialDate?: Date;
  initialViewMode?: 'month' | 'week' | 'day' | 'agenda';
  onTaskClick?: (task: CalendarTask) => void;
  onTaskReschedule?: (taskId: string, newDate: string, newStartTime?: string, newEndTime?: string) => void;
  className?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  initialDate,
  initialViewMode = 'month',
  onTaskClick,
  onTaskReschedule,
  className = '',
}) => {
  const { t } = useTranslation();
  const {
    tasks,
    isLoading,
    error,
    currentDate,
    viewMode,
    setCurrentDate,
    setViewMode,
    rescheduleTaskWithConflictCheck,
  } = useCalendar(initialDate, initialViewMode);

  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTaskDrop = async (result: any) => {
    if (!result.destination || !onTaskReschedule) return;

    const { draggableId: taskId, destination } = result;
    const droppableId = destination.droppableId;

    // Parse the drop location
    let newDate: string;
    let newStartTime: string | undefined;

    if (droppableId.startsWith('day-')) {
      const parts = droppableId.split('-');
      if (parts.length >= 3) {
        newDate = parts[1];
        if (parts.length >= 4 && parts[2] === 'slot') {
          newStartTime = parts[3];
        }
      } else {
        return; // Invalid drop location
      }
    } else {
      return; // Unknown drop location format
    }

    try {
      const result = await rescheduleTaskWithConflictCheck(taskId, newDate, newStartTime);
      if (result.success) {
        onTaskReschedule(taskId, newDate, newStartTime);
      } else {
        toast.error(`Impossible de replanifier la tâche : ${result.error}`);
      }
    } catch (_error) {
      toast.error('Une erreur s\'est produite lors de la replanification de la tâche.');
    }
  };

  const renderCalendarContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 mb-2">{t('errors.loadFailed')}</div>
            <div className="text-gray-600 text-sm">{error}</div>
          </div>
        </div>
      );
    }

    const commonProps = {
      tasks,
      currentDate,
      onTaskClick,
    };

    switch (viewMode) {
      case 'month':
        return <MonthView {...commonProps} />;
      case 'week':
        return (
          <WeekView
            {...commonProps}
            onTaskDrop={onTaskReschedule ? handleTaskDrop : undefined}
          />
        );
      case 'day':
        return (
          <DayView
            {...commonProps}
            onTaskDrop={onTaskReschedule ? handleTaskDrop : undefined}
          />
        );
      case 'agenda':
        return <AgendaView {...commonProps} />;
      default:
        return <MonthView {...commonProps} />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onDateChange={setCurrentDate}
        onViewModeChange={setViewMode}
        onTodayClick={handleTodayClick}
      />

      <div className="flex-1 overflow-hidden">
        {viewMode === 'week' || viewMode === 'day' ? (
          <DragDropContext onDragEnd={handleTaskDrop}>
            {renderCalendarContent()}
          </DragDropContext>
        ) : (
          renderCalendarContent()
        )}
      </div>
    </div>
  );
};
