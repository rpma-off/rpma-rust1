import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/domains/auth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type { InventoryStats } from '../api/types';

const AUTH_ERROR_MESSAGE = 'Authentication required';

export function useInventoryStats() {
  const { user } = useAuth();
  const sessionToken = user?.token;
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!sessionToken) {
      setStats(null);
      setError(AUTH_ERROR_MESSAGE);
      setLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const result = await inventoryIpc.getInventoryStats(sessionToken);
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [sessionToken]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
