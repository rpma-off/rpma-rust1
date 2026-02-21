import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { CalendarView } from './CalendarView';
import type { CalendarTask } from '@/lib/backend';

interface DragDropCalendarProps {
  initialDate?: Date;
  initialViewMode?: 'month' | 'week' | 'day' | 'agenda';
  onTaskClick?: (task: CalendarTask) => void;
  onTaskReschedule?: (taskId: string, newDate: string, newStartTime?: string, newEndTime?: string) => void;
  onConflictDetected?: (taskId: string, conflicts: CalendarTask[]) => void;
  className?: string;
}

export const DragDropCalendar: React.FC<DragDropCalendarProps> = ({
  initialDate,
  initialViewMode = 'week',
  onTaskClick,
  onTaskReschedule,
  onConflictDetected: _onConflictDetected,
  className = '',
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onTaskReschedule) return;

    const { draggableId: taskId, destination } = result;
    const droppableId = destination.droppableId;

    // Parse the drop location to extract date and time
    let newDate: string | undefined;
    let newStartTime: string | undefined;

    try {
      if (droppableId.startsWith('day-')) {
        const parts = droppableId.split('-');
        if (parts.length >= 2) {
          newDate = parts[1];

          // Check if it's a time slot
          if (parts.length >= 4 && parts[2] === 'slot') {
            newStartTime = parts[3];
          }
        }
      } else if (droppableId.includes('-slot-')) {
        // For other view formats, extract date and time
        const parts = droppableId.split('-slot-');
        if (parts.length === 2) {
          newDate = parts[0].replace('day-', '');
          newStartTime = parts[1];
        }
      }

      if (newDate) {
        // Trigger reschedule
        onTaskReschedule(taskId, newDate, newStartTime);
      }
    } catch (error) {
      console.error('Error parsing drop location:', error);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <CalendarView
        initialDate={initialDate}
        initialViewMode={initialViewMode}
        onTaskClick={onTaskClick}
        onTaskReschedule={onTaskReschedule}
        className={className}
      />
    </DragDropContext>
  );
};