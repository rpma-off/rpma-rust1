import { TaskWithDetails } from '@/types/task.types';

/**
 * Convert null values to undefined for frontend compatibility
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Convert null values to undefined for all properties in an object
 */
export function convertNullsToUndefined<T extends Record<string, any>>(obj: T): { [K in keyof T]: T[K] extends null ? undefined : T[K] } {
  const result = {} as any;
  for (const key in obj) {
    if (obj[key] === null) {
      result[key] = undefined;
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Normalized task data structure that handles all data inconsistencies
 */
export interface NormalizedTask {
  id: string;
  taskNumber: string;
  title: string;
  description?: string;

  // Customer information (normalized from multiple sources)
  customer: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };

  // Vehicle information
  vehicle: {
    make?: string;
    model?: string;
    year?: number;
    plate?: string;
    vin?: string;
  };

  // Status and priority
  status: string;
  priority: string;

  // Assignment
  technician?: {
    id?: string;
    name?: string;
    email?: string;
  };

  // Scheduling (normalized)
  schedule: {
    date?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
  };

  // PPF zones (normalized array)
  ppfZones?: string[];

  ppfConfiguration: {
    zones: { name: string }[];
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Normalizes task data from various sources into a consistent format
 */
export function normalizeTaskData(task: TaskWithDetails | null): NormalizedTask | null {
  if (!task) return null;

  // Extract customer info from direct properties
  const customer = {
    name: task.customer_name || undefined,
    email: task.customer_email || undefined,
    phone: task.customer_phone || undefined,
    address: task.customer_address || undefined,
  };

  // Extract vehicle info
  const vehicle = {
    make: task.vehicle_make || undefined,
    model: task.vehicle_model || undefined,
    year: task.vehicle_year ? parseInt(String(task.vehicle_year), 10) : undefined,
    plate: task.vehicle_plate || undefined,
    vin: task.vin || undefined,
  };

  // Extract technician info - technician data needs to be joined separately
  const technician = undefined; // TODO: Join technician data from separate query

  // Normalize schedule data
  const schedule = {
    date: task.scheduled_date || task.date_rdv || undefined,
    startTime: task.start_time || task.heure_rdv || undefined,
    endTime: nullToUndefined(task.end_time),
    duration: typeof task.actual_duration === 'string'
      ? parseInt(task.actual_duration, 10)
      : task.actual_duration || calculateDuration(nullToUndefined(task.start_time || task.heure_rdv), nullToUndefined(task.end_time)),
  };

  // Normalize PPF zones
  const ppfZones = task.ppf_zones || [];

  return {
    id: task.id,
    taskNumber: task.task_number || task.id,
    title: task.title,
    description: nullToUndefined(task.description),
    customer,
    vehicle,
    status: task.status,
    priority: task.priority,
    technician,
    schedule,
    ppfZones,
    ppfConfiguration: {
      zones: ppfZones?.map(name => ({ name })) || [],
    },
    createdAt: typeof task.created_at === 'bigint' ? new Date(Number(task.created_at)).toISOString() : task.created_at || new Date().toISOString(),
    updatedAt: typeof task.updated_at === 'bigint' ? new Date(Number(task.updated_at)).toISOString() : task.updated_at || new Date().toISOString(),
    completedAt: typeof task.completed_at === 'bigint' ? new Date(Number(task.completed_at)).toISOString() : task.completed_at || undefined,
  };
}

/**
 * Calculates duration between start and end times
 */
function calculateDuration(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) return undefined;

  try {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
  } catch {
    return undefined;
  }
}

/**
 * Normalizes PPF zones from various formats into a consistent array
 */
function normalizePPFZones(zones: unknown): string[] | undefined {
  if (!zones) return undefined;

  if (Array.isArray(zones)) {
    return zones.map(z => typeof z === 'string' ? z : String(z));
  }

  if (typeof zones === 'string') {
    // Try to parse as JSON first, then split by comma
    try {
      const parsed = JSON.parse(zones);
      if (Array.isArray(parsed)) {
        return parsed.map(z => String(z));
      }
    } catch {
      return zones.split(',').map(z => z.trim());
    }
  }

  return [String(zones)];
}