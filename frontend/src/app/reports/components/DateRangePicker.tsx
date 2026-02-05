'use client';

import { useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    {
      label: "Aujourd'hui",
      range: { start: new Date(), end: new Date() },
      icon: <Clock className="h-4 w-4" />,
      color: "bg-blue-500/20 text-blue-400"
    },
    {
      label: "7 derniers jours",
      range: { start: subDays(new Date(), 7), end: new Date() },
      icon: <CalendarIcon className="h-4 w-4" />,
      color: "bg-green-500/20 text-green-400"
    },
    {
      label: "Cette semaine",
      range: {
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 })
      },
      icon: <CalendarIcon className="h-4 w-4" />,
      color: "bg-purple-500/20 text-purple-400"
    },
    {
      label: "Ce mois",
      range: {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      },
      icon: <CalendarIcon className="h-4 w-4" />,
      color: "bg-orange-500/20 text-orange-400"
    },
    {
      label: "30 derniers jours",
      range: {
        start: subDays(new Date(), 30),
        end: new Date()
      },
      icon: <CalendarIcon className="h-4 w-4" />,
      color: "bg-cyan-500/20 text-cyan-400"
    },
    {
      label: "3 derniers mois",
      range: {
        start: subMonths(new Date(), 3),
        end: new Date()
      },
      icon: <CalendarIcon className="h-4 w-4" />,
      color: "bg-pink-500/20 text-pink-400"
    },
    {
      label: "Cette année",
      range: {
        start: startOfYear(new Date()),
        end: endOfYear(new Date())
      },
      icon: <CalendarIcon className="h-4 w-4" />,
      color: "bg-indigo-500/20 text-indigo-400"
    }
  ];

  const handlePresetClick = (range: { start: Date; end: Date }) => {
    onDateRangeChange(range);
    setIsOpen(false);
  };

  const handleCustomRange = (days: number) => {
    const end = new Date();
    const start = addDays(end, -days);
    onDateRangeChange({ start, end });
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
      <div className="flex items-center space-x-2">
        <CalendarIcon className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">Période:</span>
      </div>

      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
        <Badge variant="outline" className="border-gray-600 text-gray-300 hover:border-gray-500 transition-colors justify-center sm:justify-start">
          {format(dateRange.start, 'dd MMM yyyy', { locale: fr })}
        </Badge>
        <span className="text-gray-500 hidden sm:inline">→</span>
        <span className="text-gray-500 sm:hidden text-center">à</span>
        <Badge variant="outline" className="border-gray-600 text-gray-300 hover:border-gray-500 transition-colors justify-center sm:justify-start">
          {format(dateRange.end, 'dd MMM yyyy', { locale: fr })}
        </Badge>
      </div>

      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 w-full sm:w-auto"
        >
          <Zap className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Raccourcis</span>
          <span className="sm:hidden">Périodes</span>
          <ChevronLeft className={`h-4 w-4 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                Périodes rapides
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {presetRanges.slice(0, 6).map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset.range)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-all duration-200 hover:scale-105"
                  >
                    <div className={`p-1 rounded ${preset.color}`}>
                      {preset.icon}
                    </div>
                    <span className="truncate">{preset.label}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-700 my-3"></div>

              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                Périodes personnalisées
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[7, 14, 30, 60, 90, 120, 180, 365].map((days) => (
                  <button
                    key={days}
                    onClick={() => handleCustomRange(days)}
                    className="px-2 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-all duration-200 hover:scale-105 font-medium"
                  >
                    {days}j
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center sm:justify-start space-x-1 text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-md">
        <Clock className="h-3 w-3" />
        <span>{Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} jours</span>
      </div>
    </div>
  );
}
