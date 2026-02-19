'use client';

import { useCallback, useEffect, useState } from 'react';
import { configurationService } from '../server';
import type { AdminConfiguration, AdminConfigurationState } from './types';

export function useAdminConfiguration(category?: string): AdminConfigurationState {
  const [configurations, setConfigurations] = useState<AdminConfiguration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await configurationService.getSystemConfigurations(
        category ? { category } : undefined
      );

      if (!response.success) {
        setConfigurations([]);
        setError(response.error ?? 'Failed to load admin configuration');
        return;
      }

      setConfigurations((response.data ?? []) as AdminConfiguration[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load admin configuration';
      setConfigurations([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    configurations,
    loading,
    error,
    refresh,
  };
}
