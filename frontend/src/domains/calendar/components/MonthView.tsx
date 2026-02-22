import React, { useMemo } from 'react';
import { TaskCard } from './TaskCard';
import type { CalendarTask } from '@/lib/backend';

interface MonthViewProps {
  tasks: CalendarTask[];
  currentDate: Date;
  onTaskClick?: (task: CalendarTask) => void;
  className?: string;
}

export const MonthView: React.FC<MonthViewProps> = ({
  tasks,
  currentDate,
  onTaskClick,
  className = '',
}) => {
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();

    const totalDays = 42;
    const days = [];

    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
        tasks: [],
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter(task => task.scheduled_date === dateString);
      days.push({
        date,
        isCurrentMonth: true,
        tasks: dayTasks,
      });
    }

    const remainingDays = totalDays - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
        tasks: [],
      });
    }

    return days;
  }, [tasks, currentDate]);

  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const today = new Date();

  return (
    <div
      className={`bg-white border border-[hsl(var(--rpma-border))] rounded-[10px] overflow-hidden flex flex-col ${className}`}
      style={{ minHeight: 0 }}
    >
      {/* En-tête jours de la semaine */}
      <div className="grid grid-cols-7 border-b border-[hsl(var(--rpma-border))] bg-white flex-shrink-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r last:border-r-0 border-[hsl(var(--rpma-border))]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grille des jours — s'étire pour remplir l'espace disponible */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr', minHeight: 0 }}>
        {monthData.map((day, index) => {
          const isToday = day.date.toDateString() === today.toDateString();
          const isMuted = !day.isCurrentMonth;

          return (
            <div
              key={index}
              className="border-r border-b last:border-r-0 border-[hsl(var(--rpma-border))] p-2 bg-white overflow-hidden"
            >
              <div className="flex items-center justify-start mb-1">
                <div
                  className={`
                    text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-[hsl(var(--rpma-teal))] text-white' : 'text-foreground'}
                    ${isMuted ? 'text-muted-foreground' : ''}
                  `}
                >
                  {day.date.getDate()}
                </div>
              </div>

              <div className="space-y-1">
                {day.tasks.slice(0, 3).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    mode="compact"
                    className="text-xs"
                    onClick={() => onTaskClick?.(task)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
