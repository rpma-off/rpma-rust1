import React, { useMemo } from 'react';
import { TaskCard } from './TaskCard';
import type { CalendarTask } from '../../lib/backend';
import { designTokens } from '../../lib/design-tokens';

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
    <div className={`bg-white ${className}`}>
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b sticky top-0 bg-white z-10" style={{ borderColor: designTokens.colors.border }}>
        {weekDays.map(day => (
          <div
            key={day}
            className="p-3 text-center text-sm font-semibold border-r last:border-r-0 uppercase tracking-wide"
            style={{
              color: designTokens.colors.textSecondary,
              borderColor: designTokens.colors.border
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {monthData.map((day, index) => {
          const isToday = day.date.toDateString() === today.toDateString();
          const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

          return (
            <div
              key={index}
              className={`
                min-h-[120px] p-2 border-r border-b last:border-r-0
                hover:shadow-sm transition-shadow duration-150
              `}
              style={{
                backgroundColor: day.isCurrentMonth && !isWeekend ? '#FFFFFF' :
                              day.isCurrentMonth && isWeekend ? '#F8FAFC' :
                              '#F3F4F6',
                borderColor: designTokens.colors.border,
              }}
            >
              <div
                className={`
                  text-sm font-medium mb-2 rounded-full w-7 h-7 flex items-center justify-center
                `}
                style={{
                  color: isToday ? '#FFFFFF' : (day.isCurrentMonth ? designTokens.colors.textPrimary : designTokens.colors.textTertiary),
                  backgroundColor: isToday ? designTokens.colors.primary : ''
                }}
              >
                {day.date.getDate()}
              </div>

              <div className="space-y-1 max-h-[85px] overflow-y-auto">
                {day.tasks.slice(0, 4).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    mode="compact"
                    className="text-xs"
                    onClick={() => onTaskClick?.(task)}
                  />
                ))}
                {day.tasks.length > 4 && (
                  <div
                    className="text-xs text-center py-1 font-medium cursor-pointer hover:text-primary"
                    style={{ color: designTokens.colors.textSecondary }}
                    onClick={() => {
                      day.tasks.slice(4).forEach(task => onTaskClick?.(task));
                    }}
                  >
                    +{day.tasks.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};