import { Task } from '@/lib/backend';
import { DashboardTask } from '@/components/dashboard/types';

/**
 * Centralized utilities for consistent task display across the application
 */

/**
 * Get a meaningful display title for a task
 * Falls back to generated title based on available data if title is generic
 */
export const getTaskDisplayTitle = (task: Task): string => {
  // If we have a meaningful title (not the generic "Nouvelle tâche")
  if (task.title && task.title.trim() !== '' && task.title !== 'Nouvelle tâche') {
    return task.title.trim();
  }

  // Generate meaningful fallback based on available data
  const parts: string[] = [];

  // Primary: Vehicle information
  if (task.vehicle_make && task.vehicle_model) {
    parts.push(`${task.vehicle_make} ${task.vehicle_model}`);
  } else if (task.vehicle_make) {
    parts.push(task.vehicle_make);
  } else if (task.vehicle_model) {
    parts.push(task.vehicle_model);
  }

  // Secondary: License plate
  if (task.vehicle_plate) {
    parts.push(`(${task.vehicle_plate})`);
  }

  // Tertiary: Customer name
  if (!parts.length && task.customer_name) {
    parts.push(`Intervention ${task.customer_name}`);
  }

  // Fallback: Task number
  if (!parts.length && task.task_number) {
    parts.push(`Tâche ${task.task_number}`);
  }

  // Ultimate fallback: Generic with ID
  if (!parts.length) {
    parts.push(`Tâche ${task.id.slice(0, 8)}`);
  }

  return parts.join(' ');
};

/**
 * Get a meaningful display title for a dashboard task
 * Falls back to generated title based on available data if title is generic
 */
export const getDashboardTaskDisplayTitle = (task: DashboardTask): string => {
  // If we have a meaningful title (not the generic "Nouvelle tâche")
  if (task.title && task.title.trim() !== '' && task.title !== 'Nouvelle tâche') {
    return task.title.trim();
  }

  // Generate meaningful fallback based on available data
  const parts: string[] = [];

  // Primary: Vehicle information
  if (task.vehicle && task.vehicle_model) {
    parts.push(`${task.vehicle} ${task.vehicle_model}`);
  } else if (task.vehicle) {
    parts.push(task.vehicle);
  } else if (task.vehicle_model) {
    parts.push(task.vehicle_model);
  }

  // Secondary: Customer name
  if (!parts.length && task.customer_name) {
    parts.push(`Intervention ${task.customer_name}`);
  }

  // Ultimate fallback: Generic with ID
  if (!parts.length) {
    parts.push(`Tâche ${task.id.slice(0, 8)}`);
  }

  return parts.join(' ');
};

/**
 * Get localized status text for display
 */
export const getTaskDisplayStatus = (status: Task['status']): string => {
  const statusMap: Record<Task['status'], string> = {
    draft: 'Brouillon',
    scheduled: 'Planifiée',
    in_progress: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée',
    on_hold: 'En attente',
    pending: 'En attente',
    invalid: 'Invalide',
    archived: 'Archivée',
    failed: 'Échouée',
    overdue: 'En retard',
    assigned: 'Assignée',
    paused: 'En pause'
  };

  return statusMap[status] || status;
};

/**
 * Get priority display text
 */
export const getTaskDisplayPriority = (priority: Task['priority']): string => {
  const priorityMap: Record<Task['priority'], string> = {
    low: 'Basse',
    medium: 'Moyenne',
    high: 'Haute',
    urgent: 'Urgente'
  };

  return priorityMap[priority] || priority;
};

/**
 * Get technician display name with fallback
 */
type DisplayEntity = string | null | undefined | Record<string, unknown>;

export const getTechnicianDisplayName = (technician: DisplayEntity): string => {
  if (!technician) return 'Non assigné';

  if (typeof technician === 'string') return technician;

  // Handle technician object
  if (typeof technician.name === 'string') return technician.name;
  if (typeof technician.first_name === 'string' && typeof technician.last_name === 'string') {
    return `${technician.first_name} ${technician.last_name}`;
  }
  if (typeof technician.first_name === 'string') return technician.first_name;
  if (typeof technician.last_name === 'string') return technician.last_name;
  if (typeof technician.email === 'string') return technician.email;

  return 'Non assigné';
};

/**
 * Get client display name with fallback
 */
export const getClientDisplayName = (client: DisplayEntity): string => {
  if (!client) return 'Client non spécifié';

  if (typeof client === 'string') return client;

  // Handle client object
  if (typeof client.name === 'string') return client.name;
  if (typeof client.company_name === 'string') return client.company_name;
  if (typeof client.email === 'string') return client.email;

  return 'Client non spécifié';
};

/**
 * Format vehicle information for display
 */
export const getVehicleDisplayInfo = (task: Task): string => {
  const parts: string[] = [];

  if (task.vehicle_make) parts.push(task.vehicle_make);
  if (task.vehicle_model) parts.push(task.vehicle_model);
  if (task.vehicle_year) parts.push(task.vehicle_year);

  return parts.join(' ') || 'Véhicule non spécifié';
};

/**
 * Generate a proper task title based on form data
 * Used when creating/updating tasks
 */
export const generateTaskTitle = (formData: {
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;
  customer_name?: string | null;
  task_number?: string | null;
}): string | null => {
  // Primary: Vehicle with plate
  if (formData.vehicle_make && formData.vehicle_model) {
    const vehicle = `${formData.vehicle_make} ${formData.vehicle_model}`;
    if (formData.vehicle_plate) {
      return `${vehicle} (${formData.vehicle_plate})`;
    }
    return vehicle;
  }

  // Secondary: Customer name
  if (formData.customer_name) {
    return `Intervention ${formData.customer_name}`;
  }

  // Fallback: Task number
  if (formData.task_number) {
    return `Tâche ${formData.task_number}`;
  }

  // Ultimate fallback - return null to let backend handle it
  return null;
};
