import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, List, Grid3X3, Clock } from 'lucide-react';
import type { CalendarViewMode } from '../../hooks/useCalendar';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onTodayClick: () => void;
  className?: string;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onTodayClick,
  className = '',
}) => {
  const formatDateRange = () => {
    const _year = currentDate.getFullYear();
    const _month = currentDate.getMonth();
    const day = currentDate.getDate();

    switch (viewMode) {
      case 'month':
        return new Intl.DateTimeFormat('fr-FR', {
          year: 'numeric',
          month: 'long',
        }).format(currentDate);
      case 'week': {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(day - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString('fr-FR')} - ${endOfWeek.toLocaleDateString('fr-FR')}`;
      }
      case 'day':
        return new Intl.DateTimeFormat('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(currentDate);
      case 'agenda':
        return `Agenda - À partir du ${currentDate.toLocaleDateString('fr-FR')}`;
      default:
        return currentDate.toLocaleDateString('fr-FR');
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'agenda':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 30 : -30));
        break;
    }

    onDateChange(newDate);
  };

  const viewModeOptions: Array<{ mode: CalendarViewMode; label: string; icon: React.ReactNode }> = [
    { mode: 'month', label: 'Mois', icon: <Grid3X3 className="w-4 h-4" /> },
    { mode: 'week', label: 'Semaine', icon: <Calendar className="w-4 h-4" /> },
    { mode: 'day', label: 'Jour', icon: <Clock className="w-4 h-4" /> },
    { mode: 'agenda', label: 'Agenda', icon: <List className="w-4 h-4" /> },
  ];

  return (
    <div className={`flex items-center justify-between p-4 bg-white border-b border-gray-200 ${className}`}>
      {/* Navigation Controls */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigateDate('prev')}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Période précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={onTodayClick}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Aujourd&apos;hui
        </button>

        <button
          onClick={() => navigateDate('next')}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Période suivante"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="text-lg font-semibold text-gray-900 ml-4">
          {formatDateRange()}
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        {viewModeOptions.map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${viewMode === mode
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
