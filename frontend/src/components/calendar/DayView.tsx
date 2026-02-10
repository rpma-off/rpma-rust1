import React, { useMemo } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';
import type { CalendarTask } from '../../lib/backend';
import { designTokens } from '../../lib/design-tokens';

interface DayViewProps {
  tasks: CalendarTask[];
  currentDate: Date;
  onTaskClick?: (task: CalendarTask) => void;
  onTaskDrop?: (taskId: string, newDate: string, newStartTime?: string, newEndTime?: string) => void;
  className?: string;
}

export const DayView: React.FC<DayViewProps> = ({
  tasks,
  currentDate,
  onTaskClick,
  onTaskDrop,
  className = '',
}) => {
  const dayTasks = useMemo(() => {
    const dateString = currentDate.toISOString().split('T')[0];
    return tasks.filter(task => task.scheduled_date === dateString);
  }, [tasks, currentDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) { // 8 AM to 6 PM
      for (let minute = 0; minute < 60; minute += 30) { // 30-minute intervals
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className={`bg-white ${className}`}>
      {/* Day header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: designTokens.colors.border }}
      >
        <h2
          className="text-xl font-semibold"
          style={{ color: designTokens.colors.textPrimary }}
        >
          {formatDate(currentDate)}
        </h2>
      </div>

      <div className="flex">
        {/* Time slots */}
        <div className="w-20 flex-shrink-0">
          {timeSlots.map((timeSlot) => (
            <div
              key={timeSlot}
              className="h-16 border-b px-2 py-1 text-xs flex items-start justify-end"
              style={{
                borderColor: designTokens.colors.borderLight,
                color: designTokens.colors.textSecondary,
                backgroundColor: designTokens.colors.surface
              }}
            >
              {timeSlot}
            </div>
          ))}
        </div>

        {/* Tasks column */}
        <div className="flex-1">
          {timeSlots.map((timeSlot) => (
            <Droppable
              key={`slot-${timeSlot}`}
              droppableId={`day-slot-${timeSlot}`}
              isDropDisabled={!onTaskDrop}
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`
                    h-16 border-b p-1 transition-colors duration-200
                  `}
                  style={{
                    borderColor: designTokens.colors.borderLight,
                    backgroundColor: snapshot.isDraggingOver ? designTokens.colors.surface : ''
                  }}
                >
                  {dayTasks
                    .filter(task => task.start_time === timeSlot)
                    .map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                        isDragDisabled={!onTaskDrop}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="mb-1"
                          >
                            <TaskCard
                              task={task}
                              mode="compact"
                              onClick={() => onTaskClick?.(task)}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </div>

      {/* Unscheduled tasks */}
      <div
        className="border-t p-4"
        style={{ borderColor: designTokens.colors.border }}
      >
        <h3
          className="text-sm font-medium mb-3"
          style={{ color: designTokens.colors.textPrimary }}
        >
          Tâches non planifiées
        </h3>
        <Droppable
          droppableId="day-unscheduled"
          isDropDisabled={!onTaskDrop}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                min-h-[100px] space-y-2
              `}
              style={{
                backgroundColor: snapshot.isDraggingOver ? designTokens.colors.surface : ''
              }}
            >
              {dayTasks
                .filter(task => !task.start_time)
                .map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id}
                    index={index}
                    isDragDisabled={!onTaskDrop}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <TaskCard
                          task={task}
                          mode="full"
                          onClick={() => onTaskClick?.(task)}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};
