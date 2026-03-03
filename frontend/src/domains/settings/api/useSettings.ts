'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/domains/auth';
import { settingsService } from '../server';
import type { UserSettings } from '@/lib/backend';
import type { UseSettingsResult } from './types';

const CACHE_KEY = 'rpma:settings_cache';
const CACHE_TTL_MS = 30_000; // 30 seconds — matches IPC cachedInvoke TTL

interface CacheEntry {
  data: UserSettings;
  ts: number;
}

function readCache(): UserSettings | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: UserSettings): void {
  try {
    const entry: CacheEntry = { data, ts: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota exceeded or SSR — silently ignore
  }
}

/** Invalidate the local settings cache (call after mutations). */
export function invalidateSettingsCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // SSR — ignore
  }
}

export function useSettings(): UseSettingsResult {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(() => readCache());
  const [loading, setLoading] = useState<boolean>(!readCache());
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

      const data = response.data ?? null;
      setSettings(data);
      if (data) writeCache(data);
    } catch (err) {
      setSettings(null);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    // Refetch from backend on mount and when the token changes.
    fetchedRef.current = true;
    void refetch();
  }, [refetch]);

  return {
    settings,
    loading,
    error,
    refetch,
  };
}
