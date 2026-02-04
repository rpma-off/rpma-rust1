/**
 * Status Color Utilities
 * 
 * Centralized status color mappings for consistent badge and display styling
 * across the application following DESIGNV2.md specifications.
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const STATUS_COLORS = {
  pending: {
    label: 'En attente',
    variant: 'outline' as const,
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-700 dark:text-gray-300',
    borderClass: 'border-gray-300 dark:border-gray-600',
  },
  in_progress: {
    label: 'En cours',
    variant: 'secondary' as const,
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-800 dark:text-yellow-300',
    borderClass: 'border-yellow-300 dark:border-yellow-600',
  },
  completed: {
    label: 'Terminée',
    variant: 'default' as const,
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-800 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-600',
  },
  cancelled: {
    label: 'Annulée',
    variant: 'destructive' as const,
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-800 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-600',
  },
} as const;

export function getStatusLabel(status: string): string {
  return STATUS_COLORS[status as TaskStatus]?.label || status;
}

export function getStatusVariant(status: string): string {
  return STATUS_COLORS[status as TaskStatus]?.variant || 'outline';
}

export function getStatusClasses(status: string) {
  const config = STATUS_COLORS[status as TaskStatus];
  if (!config) {
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
    };
  }
  
  return {
    bg: config.bgClass,
    text: config.textClass,
    border: config.borderClass,
  };
}
