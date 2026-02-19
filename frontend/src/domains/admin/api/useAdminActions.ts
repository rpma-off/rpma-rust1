'use client';

import { useCallback } from 'react';
import { configurationService } from '../server';
import type { AdminBusinessRule, AdminConfiguration, UseAdminActionsResult } from './types';

export function useAdminActions(): UseAdminActionsResult {
  const createConfiguration = useCallback(
    async (payload: { key: string; value: unknown; category?: string }) => {
      try {
        await configurationService.createSystemConfiguration({
          key: payload.key,
          value: payload.value,
          category: payload.category ?? 'general',
        } as Omit<AdminConfiguration, 'id'>);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const updateConfiguration = useCallback(
    async (id: string, updates: Partial<AdminConfiguration>) => {
      const response = await configurationService.updateSystemConfiguration(id, updates);
      return response.success;
    },
    []
  );

  const deleteConfiguration = useCallback(async (id: string) => {
    const response = await configurationService.deleteSystemConfiguration(id);
    return response.success;
  }, []);

  const updateBusinessRule = useCallback(
    async (id: string, updates: Partial<AdminBusinessRule>) => {
      const response = await configurationService.updateBusinessRule(id, updates);
      return response.success;
    },
    []
  );

  const deleteBusinessRule = useCallback(async (id: string) => {
    const response = await configurationService.deleteBusinessRule(id);
    return response.success;
  }, []);

  return {
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    updateBusinessRule,
    deleteBusinessRule,
  };
}
