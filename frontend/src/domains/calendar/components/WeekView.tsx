import React, { useMemo } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';
import type { CalendarTask } from '@/lib/backend';
import { designTokens } from '@/lib/design-tokens';

interface WeekViewProps {
  tasks: CalendarTask[];
  currentDate: Date;
  onTaskClick?: (task: CalendarTask) => void;
  onTaskDrop?: (taskId: string, newDate: string, newStartTime?: string, newEndTime?: string) => void;
  className?: string;
}

export const WeekView: React.FC<WeekViewProps> = ({
  tasks,
  currentDate,
  onTaskClick,
  onTaskDrop,
  className = '',
}) => {
  const weekData = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter(task => task.scheduled_date === dateString);

      weekDays.push({
        date,
        dateString,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === new Date().toDateString(),
        tasks: dayTasks,
      });
    }

    return weekDays;
  }, [tasks, currentDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  }, []);

  return (
    <div
      className={`bg-white flex flex-col overflow-hidden ${className}`}
      style={{ minHeight: 0 }}
    >
      <div className="overflow-x-auto flex flex-col flex-1" style={{ minHeight: 0 }}>
        <div className="min-w-[800px] flex flex-col flex-1" style={{ minHeight: 0 }}>

          {/* En-tête jours — sticky */}
          <div
            className="grid grid-cols-8 border-b sticky top-0 bg-white z-10 shadow-sm flex-shrink-0"
            style={{ borderColor: designTokens.colors.border }}
          >
            <div
              className="p-3 border-r font-medium text-xs text-gray-500"
              style={{ borderColor: designTokens.colors.border }}
            />
            {weekData.map((day, index) => (
              <div
                key={index}
                className="p-3 text-center border-r last:border-r-0"
                style={{
                  borderColor: designTokens.colors.border,
                  backgroundColor: day.isToday ? designTokens.colors.surface : '',
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  {day.dayName}
                </div>
                <div
                  className="text-base font-bold rounded-full w-9 h-9 flex items-center justify-center mx-auto"
                  style={{
                    color: day.isToday ? '#FFFFFF' : designTokens.colors.textPrimary,
                    backgroundColor: day.isToday ? designTokens.colors.primary : '',
                  }}
                >
                  {day.dayNumber}
                </div>
              </div>
            ))}
          </div>

          {/* Zone scrollable : créneaux horaires */}
          <div className="relative overflow-y-auto flex-1" style={{ minHeight: 0 }}>
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot}
                className="grid grid-cols-8 border-b"
                style={{ borderColor: designTokens.colors.borderLight }}
              >
                <div
                  className="p-2 text-xs border-r flex items-center justify-end pr-3 font-medium"
                  style={{
                    color: designTokens.colors.textSecondary,
                    borderColor: designTokens.colors.border,
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  {timeSlot}
                </div>

                {weekData.map((day) => (
                  <Droppable
                    key={`${day.dateString}-${timeSlot}`}
                    droppableId={`day-${day.dateString}-slot-${timeSlot}`}
                    isDropDisabled={!onTaskDrop}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="min-h-[40px] p-1 border-r last:border-r-0 transition-all duration-150"
                        style={{
                          borderColor: designTokens.colors.border,
                          backgroundColor: snapshot.isDraggingOver ? designTokens.colors.surface : '',
                        }}
                      >
                        {day.tasks
                          .filter(task => task.start_time === timeSlot)
                          .map((task, taskIndex) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={taskIndex}
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
                                    className="text-xs shadow-sm"
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
            ))}

            {/* Tâches sans créneau */}
            <div
              className="grid grid-cols-8 border-t"
              style={{ borderColor: designTokens.colors.border }}
            >
              <div
                className="p-3 text-xs border-r flex items-center font-medium"
                style={{
                  color: designTokens.colors.textSecondary,
                  borderColor: designTokens.colors.border,
                  backgroundColor: '#FAFAFA',
                }}
              >
                Non planifié
              </div>
              {weekData.map((day) => (
                <Droppable
                  key={`day-${day.dateString}-unscheduled`}
                  droppableId={`day-${day.dateString}-unscheduled`}
                  isDropDisabled={!onTaskDrop}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-[60px] p-2 border-r last:border-r-0"
                      style={{
                        borderColor: designTokens.colors.border,
                        backgroundColor: snapshot.isDraggingOver ? designTokens.colors.surface : '',
                      }}
                    >
                      {day.tasks
                        .filter(task => !task.start_time)
                        .map((task, taskIndex) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={taskIndex}
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
                                  className="text-xs shadow-sm"
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

        </div>
      </div>
    </div>
  );
};
