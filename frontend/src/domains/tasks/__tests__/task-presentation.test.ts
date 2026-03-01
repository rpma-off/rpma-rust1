import {
  getStatusBadgeClass,
  getStatusVariant,
  formatDateShort,
  formatTaskDateTime,
  mapTaskErrorToUserMessage,
} from '../utils/task-presentation';
import type { TaskWithDetails } from '../api/types';

describe('task-presentation utilities', () => {
  describe('getStatusBadgeClass', () => {
    it('returns emerald for completed', () => {
      expect(getStatusBadgeClass('completed')).toContain('bg-emerald');
    });

    it('returns amber for in_progress', () => {
      expect(getStatusBadgeClass('in_progress')).toContain('bg-amber');
    });

    it('returns blue for scheduled', () => {
      expect(getStatusBadgeClass('scheduled')).toContain('bg-blue');
    });

    it('returns slate for cancelled', () => {
      expect(getStatusBadgeClass('cancelled')).toContain('bg-slate');
    });

    it('returns slate for draft', () => {
      expect(getStatusBadgeClass('draft')).toContain('bg-slate');
    });

    it('returns slate for archived', () => {
      expect(getStatusBadgeClass('archived')).toContain('bg-slate');
    });

    it('returns a fallback for unknown status', () => {
      expect(getStatusBadgeClass('unknown' as never)).toContain('bg-slate');
    });
  });

  describe('getStatusVariant', () => {
    it.each([
      ['pending', 'workflow-draft'],
      ['in_progress', 'workflow-inProgress'],
      ['completed', 'workflow-completed'],
      ['cancelled', 'destructive'],
      ['other', 'secondary'],
    ])('maps %s → %s', (input, expected) => {
      expect(getStatusVariant(input)).toBe(expected);
    });
  });

  describe('formatDateShort', () => {
    it('returns "Non planifiée" for null', () => {
      expect(formatDateShort(null)).toBe('Non planifiée');
    });

    it('formats a valid ISO date string', () => {
      const result = formatDateShort('2025-06-15T12:00:00Z');
      // Should contain day/month/year in some format
      expect(result).toBeTruthy();
      expect(result).not.toBe('Non planifiée');
    });
  });

  describe('formatTaskDateTime', () => {
    it('returns placeholder when no scheduled_date', () => {
      const task = { scheduled_date: null } as unknown as TaskWithDetails;
      expect(formatTaskDateTime(task)).toBe('Date à définir');
    });

    it('includes time when start_time is present', () => {
      const task = {
        scheduled_date: '2025-06-15T12:00:00Z',
        start_time: '14:00',
        heure_rdv: null,
      } as unknown as TaskWithDetails;
      const result = formatTaskDateTime(task);
      expect(result).toContain('14:00');
    });

    it('includes heure_rdv as fallback time', () => {
      const task = {
        scheduled_date: '2025-06-15T12:00:00Z',
        start_time: null,
        heure_rdv: '09:30',
      } as unknown as TaskWithDetails;
      const result = formatTaskDateTime(task);
      expect(result).toContain('09:30');
    });
  });

  describe('mapTaskErrorToUserMessage', () => {
    it('maps Network errors', () => {
      expect(mapTaskErrorToUserMessage(new Error('Network failure'))).toContain('réseau');
    });

    it('maps 401 errors', () => {
      expect(mapTaskErrorToUserMessage(new Error('401 Unauthorized'))).toContain('reconnecter');
    });

    it('maps 403 errors', () => {
      expect(mapTaskErrorToUserMessage(new Error('403 Forbidden'))).toContain('permissions');
    });

    it('maps 404 errors', () => {
      expect(mapTaskErrorToUserMessage(new Error('404 Not Found'))).toContain('introuvable');
    });

    it('maps 500 errors', () => {
      expect(mapTaskErrorToUserMessage(new Error('500 Server Error'))).toContain('serveur');
    });

    it('returns fallback for non-Error', () => {
      expect(mapTaskErrorToUserMessage('string error')).toContain('suppression');
    });

    it('returns fallback for unknown Error', () => {
      expect(mapTaskErrorToUserMessage(new Error('something else'))).toContain('suppression');
    });
  });
});
