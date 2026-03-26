import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskStatus, TaskPriority } from '@/lib/backend';
import type { UserPreferences } from '@/lib/backend';
import { ipcClient } from '@/lib/ipc/client';
import type { CalendarViewMode } from '../hooks/useCalendar';

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
  goToToday: () => void;
  goToDate: (date: Date | undefined) => void;
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
    (set) => ({
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

      goToToday: () => set({ currentDate: new Date() }),

      goToDate: (date: Date | undefined) => {
        set({ currentDate: date ?? new Date() });
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

// Debounce helper — avoids one backend call per keypress in filter inputs.
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSyncToBackend(currentView: CalendarViewMode, filters: CalendarState['filters']) {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    ipcClient.settings.updateUserPreferences({
      calendarView: currentView,
      calendarShowMyEventsOnly: filters.showMyEventsOnly,
      calendarFilterStatuses: filters.statuses as string[],
      calendarFilterPriorities: filters.priorities as string[],
    } as Partial<UserPreferences>).catch(() => {
      // Sync failure is non-critical — localStorage still holds the preference.
    });
  }, 800);
}

// Subscribe to all state changes and mirror view/filter to the backend.
// localStorage (via persist) stays as the fast local fallback.
// The debounce ensures we don't call the backend on every keystroke.
useCalendarStore.subscribe((state) => {
  scheduleSyncToBackend(state.currentView, state.filters);
});

/**
 * Call this once on app init (e.g. in CalendarProvider) to hydrate the store
 * from backend preferences, overriding the localStorage snapshot when the user
 * has preferences saved from another device.
 */
export function hydrateCalendarFromPreferences(prefs: UserPreferences): void {
  const store = useCalendarStore.getState();
  if (prefs.calendarView) {
    store.setCurrentView(prefs.calendarView as CalendarViewMode);
  }
  if (prefs.calendarFilterStatuses || prefs.calendarFilterPriorities || prefs.calendarShowMyEventsOnly !== undefined) {
    store.setFilters({
      ...(prefs.calendarFilterStatuses && { statuses: prefs.calendarFilterStatuses as TaskStatus[] }),
      ...(prefs.calendarFilterPriorities && { priorities: prefs.calendarFilterPriorities as TaskPriority[] }),
      ...(prefs.calendarShowMyEventsOnly != null && { showMyEventsOnly: prefs.calendarShowMyEventsOnly }),
    });
  }
}
