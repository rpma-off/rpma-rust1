import { useState, useEffect, useCallback } from 'react';
import type { RecentActivity } from '../api/types';

export interface UseRecentActivityOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useRecentActivity(options: UseRecentActivityOptions = {}) {
  const { limit = 10, autoRefresh = false, refreshInterval = 60000 } = options;

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const mockActivities: RecentActivity[] = [
        {
          id: '1',
          type: 'task',
          title: 'Nouvelle tâche créée',
          description: 'Installation PPF - Peugeot 308',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          user: 'Jean Dupont',
        },
        {
          id: '2',
          type: 'intervention',
          title: 'Intervention complétée',
          description: 'Film complet - Renault Clio',
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          user: 'Marie Martin',
        },
        {
          id: '3',
          type: 'client',
          title: 'Nouveau client ajouté',
          description: 'Sophie Bernard - sophie@email.com',
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          user: 'Système',
        },
        {
          id: '4',
          type: 'quote',
          title: 'Devis envoyé',
          description: 'Devis #1234 pour Peugeot 208',
          timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
          user: 'Jean Dupont',
        },
        {
          id: '5',
          type: 'inventory',
          title: 'Stock mis à jour',
          description: 'Matériel Xpel - 10 unités ajoutées',
          timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
          user: 'Marie Martin',
        },
        {
          id: '6',
          type: 'sync',
          title: 'Synchronisation terminée',
          description: '5 opérations synchronisées',
          timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
          user: 'Système',
        },
      ];

      setActivities(mockActivities.slice(0, limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recent activity');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchActivities, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchActivities, autoRefresh, refreshInterval]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  };
}
