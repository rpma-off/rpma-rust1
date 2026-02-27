import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskStatus, TaskPriority } from '@/lib/backend';

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

interface CalendarState {
  currentView: CalendarViewMode;
  currentDate: Date;
  selectedDate: Date | null;
  selectedEventId: string | null;
  
  filters: {
    technicianId: string | null;
    statuses: TaskStatus[];
    priorities: TaskPriority[];
    clientId: string | null;
    interventionTypes: string[];
    dateRange: { start: Date; end: Date } | null;
    showMyEventsOnly: boolean;
  };
  
  isFilterDrawerOpen: boolean;
  isQuickAddOpen: boolean;
  isEventDetailOpen: boolean;
  dragging: boolean;
  currentWeekStart: Date | null;
  searchQuery: string;
  participantsFilter: string;
  eventTypeFilter: string;
  
  setCurrentView: (view: CalendarViewMode) => void;
  setCurrentDate: (date: Date | undefined) => void;
  setSelectedDate: (date: Date | null) => void;
  setSelectedEventId: (id: string | null) => void;
  setFilters: (filters: Partial<CalendarState['filters']>) => void;
  resetFilters: () => void;
  toggleFilterDrawer: () => void;
  toggleQuickAdd: () => void;
  toggleEventDetail: () => void;
  setDragging: (dragging: boolean) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToToday: () => void;
  goToDate: (date: Date | undefined) => void;
  getWeekDays: () => Date[];
  getCurrentWeekEvents: () => Record<string, unknown>[];
  addEvent: (event: Record<string, unknown>) => void;
  setEventTypeFilter: (type: string) => void;
  setParticipantsFilter: (participants: string) => void;
  setSearchQuery: (query: string) => void;
}

const initialFilters = {
  technicianId: null,
  statuses: [],
  priorities: [],
  clientId: null,
  interventionTypes: [],
  dateRange: null,
  showMyEventsOnly: false,
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      currentView: 'month',
      currentDate: new Date(),
      selectedDate: null,
      selectedEventId: null,
      currentWeekStart: null,
      filters: initialFilters,
      isFilterDrawerOpen: false,
      isQuickAddOpen: false,
      isEventDetailOpen: false,
      dragging: false,
      searchQuery: '',
      participantsFilter: 'all',
      eventTypeFilter: 'all',
      
      setCurrentView: (view) => set({ currentView: view }),
      setCurrentDate: (date) => set({ currentDate: date ?? new Date() }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedEventId: (id) => set({ selectedEventId: id }),
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      resetFilters: () => set({ filters: initialFilters }),
      toggleFilterDrawer: () => set((state) => ({ isFilterDrawerOpen: !state.isFilterDrawerOpen })),
      toggleQuickAdd: () => set((state) => ({ isQuickAddOpen: !state.isQuickAddOpen })),
      toggleEventDetail: () => set((state) => ({ isEventDetailOpen: !state.isEventDetailOpen })),
      setDragging: (dragging) => set({ dragging }),
      
      goToPrevious: () => {
        const { currentDate, currentView } = get();
        let newDate: Date;
        
        switch (currentView) {
          case 'month':
            newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            break;
          case 'week':
            newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() - 7);
            break;
          case 'day':
            newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() - 1);
            break;
          default:
            newDate = currentDate;
        }
        
        set({ currentDate: newDate });
      },
      
      goToNext: () => {
        const { currentDate, currentView } = get();
        let newDate: Date;
        
        switch (currentView) {
          case 'month':
            newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
            break;
          case 'week':
            newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + 7);
            break;
          case 'day':
            newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + 1);
            break;
          default:
            newDate = currentDate;
        }
        
        set({ currentDate: newDate });
      },
      
      goToToday: () => set({ currentDate: new Date() }),
      
      goToNextWeek: () => {
        const { currentDate } = get();
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        set({ currentDate: newDate, currentWeekStart: newDate });
      },
      
      goToPreviousWeek: () => {
        const { currentDate } = get();
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        set({ currentDate: newDate, currentWeekStart: newDate });
      },
      
      goToDate: (date: Date | undefined) => {
        set({ currentDate: date ?? new Date() });
      },
      
      getWeekDays: () => {
        const { currentDate } = get();
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day;
        const weekStart = new Date(start.setDate(diff));
        
        const days = [];
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + i);
          days.push(day);
        }
        return days;
      },
      
      getCurrentWeekEvents: (): Record<string, unknown>[] => {
        // Implementation would return events for current week
        return [];
      },
      
      addEvent: (event: Record<string, unknown>) => {
        // Implementation to add event to state
        console.log('Adding event:', event);
      },
      
      setEventTypeFilter: (type: string) => {
        set({ eventTypeFilter: type });
      },
      
      setParticipantsFilter: (participants: string) => {
        set({ participantsFilter: participants });
      },
      
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        currentView: state.currentView,
        filters: state.filters,
      }),
    }
  )
);
