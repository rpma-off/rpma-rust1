import type { TaskStatus, TaskWithDetails } from '../api/types';

/**
 * Get CSS class for a task status badge.
 */
export const getStatusBadgeClass = (status: TaskStatus): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500 text-white';
    case 'in_progress':
      return 'bg-amber-500 text-white';
    case 'scheduled':
      return 'bg-blue-500 text-white';
    case 'cancelled':
      return 'bg-slate-400 text-white';
    case 'draft':
      return 'bg-slate-500 text-white';
    case 'archived':
      return 'bg-slate-500 text-white';
    default:
      return 'bg-slate-400 text-white';
  }
};

/**
 * Get design-system variant name for a task status.
 */
export const getStatusVariant = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'workflow-draft';
    case 'in_progress':
      return 'workflow-inProgress';
    case 'completed':
      return 'workflow-completed';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

/**
 * Format a task's scheduled date for compact display (date + optional time).
 */
export const formatTaskDateTime = (task: TaskWithDetails): string => {
  if (!task.scheduled_date) return 'Date à définir';
  const date = new Date(task.scheduled_date);
  const dateText = date.toLocaleDateString('fr-FR', { month: 'numeric', day: 'numeric', year: '2-digit' });
  const timeText = task.start_time || task.heure_rdv;
  return timeText ? `${dateText} ${timeText}` : dateText;
};

/**
 * Format a date string for short display (e.g. in cards).
 */
export const formatDateShort = (dateString: string | null): string => {
  if (!dateString) return 'Non planifiée';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Map a backend / network error to a user-facing French message.
 */
export const mapTaskErrorToUserMessage = (err: unknown): string => {
  const fallback = 'Erreur lors de la suppression de la tâche';
  if (!(err instanceof Error)) return fallback;

  if (err.message.includes('Network')) {
    return 'Erreur de réseau - vérifiez votre connexion';
  }
  if (err.message.includes('401')) {
    return 'Non autorisé - veuillez vous reconnecter';
  }
  if (err.message.includes('403')) {
    return 'Accès interdit - permissions insuffisantes';
  }
  if (err.message.includes('404')) {
    return 'Tâche introuvable - elle a peut-être déjà été supprimée';
  }
  if (err.message.includes('500')) {
    return 'Erreur serveur - veuillez réessayer plus tard';
  }

  return fallback;
};
