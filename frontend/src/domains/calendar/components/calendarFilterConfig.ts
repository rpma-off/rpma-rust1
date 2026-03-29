import type { TaskPriority, TaskStatus } from '@/lib/backend';

export const INITIAL_EVENT_TYPE_FILTERS = {
  all: true,
  with_meeting: false,
  without_meeting: false,
};

export const INITIAL_PARTICIPANT_FILTERS = {
  all: true,
  with_participants: false,
  without_participants: false,
};

export const INITIAL_EXPANDED_SECTIONS = {
  search: true,
  eventType: true,
  participants: true,
  dateRange: true,
  status: true,
  priority: true,
};

export const EVENT_TYPE_OPTIONS = [
  { id: 'all' as const, label: 'Tous les types' },
  { id: 'with_meeting' as const, label: 'Avec rendez-vous' },
  { id: 'without_meeting' as const, label: 'Sans rendez-vous' },
];

export const PARTICIPANT_OPTIONS = [
  { id: 'all' as const, label: 'Tous les participants' },
  { id: 'with_participants' as const, label: 'Avec participants' },
  { id: 'without_participants' as const, label: 'Sans participants' },
];

export const STATUS_OPTIONS: Array<{ id: TaskStatus; label: string }> = [
  { id: 'pending', label: 'En attente' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'completed', label: 'Termine' },
  { id: 'cancelled', label: 'Annule' },
];

export const PRIORITY_OPTIONS: Array<{ id: TaskPriority; label: string }> = [
  { id: 'low', label: 'Basse' },
  { id: 'medium', label: 'Moyenne' },
  { id: 'high', label: 'Haute' },
  { id: 'urgent', label: 'Urgente' },
];

export function updateExclusiveFilterState<T extends Record<string, boolean>>(
  current: T,
  key: keyof T,
  checked: boolean,
): T {
  if (key === 'all') {
    return Object.keys(current).reduce(
      (next, currentKey) => ({
        ...next,
        [currentKey]: currentKey === 'all' ? checked : false,
      }),
      {} as T,
    );
  }

  return {
    ...current,
    [key]: checked,
    all: false,
  };
}

export function toDateInputValue(value?: Date | null): string {
  return value ? new Date(value).toISOString().split('T')[0] || '' : '';
}

export function withStartDate(currentEnd?: Date | null, start?: string) {
  return {
    start: start ? new Date(start) : new Date(),
    end: currentEnd ? new Date(currentEnd) : new Date(),
  };
}

export function withEndDate(currentStart?: Date | null, end?: string) {
  return {
    start: currentStart ? new Date(currentStart) : new Date(),
    end: end ? new Date(end) : new Date(),
  };
}
