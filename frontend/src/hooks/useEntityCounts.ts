import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AuthSecureStorage } from '@/lib/secureStorage';

interface EntityCounts {
  tasks: number;
  clients: number;
  interventions: number;
}

interface UseEntityCountsReturn {
  counts: EntityCounts | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEntityCounts(): UseEntityCountsReturn {
  const [counts, setCounts] = useState<EntityCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await AuthSecureStorage.getSession();
      if (!session?.token) {
        throw new Error('Authentication required');
      }

      const response: Record<string, number> = await invoke('get_entity_counts', {
        sessionToken: session.token
      });
      setCounts({
        tasks: response.tasks || 0,
        clients: response.clients || 0,
        interventions: response.interventions || 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch entity counts';
      setError(errorMessage);
      console.error('Entity counts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts,
  };
}