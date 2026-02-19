'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/domains/auth';
import { settingsService } from '../server';
import type { UserSettings } from '@/lib/backend';
import type { UseSettingsResult } from './types';

export function useSettings(): UseSettingsResult {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user?.token) {
      setSettings(null);
      setError('Authentication required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await settingsService.getUserSettings(user.token);
      if (!response.success) {
        setSettings(null);
        setError(response.error ?? 'Failed to load settings');
        return;
      }

      setSettings(response.data ?? null);
    } catch (err) {
      setSettings(null);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    settings,
    loading,
    error,
    refetch,
  };
}
