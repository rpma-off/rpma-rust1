import React, { useMemo } from 'react';
import { TaskCard } from './TaskCard';
import type { CalendarTask } from '../../lib/backend';

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

    // Get first day of the month and last day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();

    // Calculate days to show (including previous month days to fill the grid)
    const totalDays = 42; // 6 weeks * 7 days
    const days = [];

    // Add days from previous month to fill the first week
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
        tasks: [],
      });
    }

    // Add days from current month
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

    // Add days from next month to fill the last week
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
    <div className={`bg-white border border-[hsl(var(--rpma-border))] rounded-[10px] overflow-hidden ${className}`}>
      <div className="grid grid-cols-7 border-b border-[hsl(var(--rpma-border))] bg-white">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r last:border-r-0 border-[hsl(var(--rpma-border))]"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {monthData.map((day, index) => {
          const isToday = day.date.toDateString() === today.toDateString();
          const isMuted = !day.isCurrentMonth;

          return (
            <div
              key={index}
              className="min-h-[120px] border-r border-b last:border-r-0 border-[hsl(var(--rpma-border))] p-2 bg-white"
            >
              <div className="flex items-center justify-start mb-2">
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
