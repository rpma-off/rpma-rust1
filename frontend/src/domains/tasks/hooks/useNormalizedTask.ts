import { useMemo } from 'react';
import { normalizeTaskData, NormalizedTask } from '@/lib/utils/data-normalization';
import { TaskWithDetails } from '@/types/task.types';

/**
 * Hook to normalize task data consistently across the application
 * Handles all data inconsistencies identified in the analysis:
 * - Customer info from multiple sources
 * - PPF zones in different formats
 * - Schedule data redundancy
 */
export function useNormalizedTask(task: TaskWithDetails | null): NormalizedTask | null {
  return useMemo(() => {
    if (!task) return null;

    try {
      return normalizeTaskData(task);
    } catch (error) {
      console.error('Failed to normalize task:', error);
      return null;
    }
  }, [task]);
}

/**
 * Hook to normalize multiple tasks
 */
export function useNormalizedTasks(tasks: TaskWithDetails[]): NormalizedTask[] {
  return useMemo(() => {
    if (!Array.isArray(tasks)) return [];

    return tasks
      .map(task => {
        try {
          return normalizeTaskData(task);
        } catch (error) {
          console.error(`Failed to normalize task ${task?.id}:`, error);
          return null;
        }
      })
      .filter((task): task is NormalizedTask => task !== null);
  }, [tasks]);
}

/**
 * Hook specifically for customer information normalization
 * Provides a single source of truth for customer data
 */
export function useCustomerInfo(task: TaskWithDetails | null) {
  return useMemo(() => {
    if (!task) return null;

    const normalized = normalizeTaskData(task);
    return normalized?.customer;
  }, [task]);
}

/**
 * Hook specifically for PPF configuration normalization
 * Handles all the different PPF zone formats
 */
export function usePPFConfiguration(task: TaskWithDetails | null) {
  return useMemo(() => {
    if (!task) return null;

    const normalized = normalizeTaskData(task);
    return normalized?.ppfConfiguration;
  }, [task]);
}

/**
 * Hook specifically for schedule information normalization
 * Resolves all the different date/time field conflicts
 */
export function useScheduleInfo(task: TaskWithDetails | null) {
  return useMemo(() => {
    if (!task) return null;

    const normalized = normalizeTaskData(task);
    return normalized?.schedule;
  }, [task]);
}

/**
 * Hook to get display-ready customer name with fallbacks
 */
export function useCustomerDisplayName(task: TaskWithDetails | null): string {
  return useMemo(() => {
    if (!task) return 'Client inconnu';

    const normalized = normalizeTaskData(task);
    const customerInfo = normalized?.customer;

    if (!customerInfo) return 'Client inconnu';

    return customerInfo.name || 'Client sans nom';
  }, [task]);
}

/**
 * Hook to get formatted vehicle information
 */
export function useVehicleDisplayInfo(task: TaskWithDetails | null): string {
  return useMemo(() => {
    if (!task) return 'Véhicule inconnu';

    const normalized = normalizeTaskData(task);
    const { vehicle } = normalized || {};

    const parts: string[] = [];

    if (vehicle?.make) parts.push(vehicle.make);
    if (vehicle?.model) parts.push(vehicle.model);
    if (vehicle?.year) parts.push(vehicle.year.toString());
    if (vehicle?.plate) parts.push(`(${vehicle.plate})`);

    return parts.length > 0 ? parts.join(' ') : 'Véhicule non spécifié';
  }, [task]);
}

/**
 * Hook to get formatted PPF zones list
 */
export function usePPFZonesList(task: TaskWithDetails | null): string[] {
  return useMemo(() => {
    if (!task) return [];

    const normalized = normalizeTaskData(task);
    return normalized?.ppfConfiguration?.zones?.map((zone: { name: string }) => zone.name) || [];
  }, [task]);
}

/**
 * Hook to get formatted schedule display
 */
export function useScheduleDisplay(task: TaskWithDetails | null): {
  scheduledText: string;
  startedText: string | null;
  completedText: string | null;
  durationText: string | null;
} {
  return useMemo(() => {
    const result: {
      scheduledText: string;
      startedText: string | null;
      completedText: string | null;
      durationText: string | null;
    } = {
      scheduledText: 'Non programmé',
      startedText: null,
      completedText: null,
      durationText: null
    };

    if (!task) return result;

    const normalized = normalizeTaskData(task);
    const schedule = normalized?.schedule;

    // Format scheduled time
    if (schedule?.date) {
      result.scheduledText = new Date(schedule.date).toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    }

    // Format start time
    if (schedule?.startTime) {
      result.startedText = new Date(schedule.startTime).toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    }

    // Format end time
    if (schedule?.endTime) {
      result.completedText = new Date(schedule.endTime).toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    }

    // Format duration
    if (schedule?.duration && schedule.duration > 0) {
      const hours = Math.floor(schedule.duration / 60);
      const minutes = schedule.duration % 60;

      if (hours > 0) {
        result.durationText = `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
      } else {
        result.durationText = `${minutes}min`;
      }
    }

    return result;
  }, [task]);
}

// Export normalized task hooks as a named object
const normalizedTaskHooks = {
  useNormalizedTask,
  useNormalizedTasks,
  useCustomerInfo,
  usePPFConfiguration,
  useScheduleInfo,
  useCustomerDisplayName,
  useVehicleDisplayInfo,
  usePPFZonesList,
  useScheduleDisplay
};

// Export default as a variable (not anonymous)
export default normalizedTaskHooks;