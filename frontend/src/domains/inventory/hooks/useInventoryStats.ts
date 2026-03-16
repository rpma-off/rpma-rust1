'use client';

import { useQuery } from '@tanstack/react-query';
import { inventoryKeys } from '@/lib/query-keys';
import { canAccessInventory } from '@/types/auth.types';
import { useAuth } from '@/shared/hooks/useAuth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type { InventoryStats } from '../api/types';
import { getInventoryAuthError } from './inventory-query-auth';

export function useInventoryStats() {
  const { user } = useAuth();
  const sessionToken = user?.token;
  const hasInventoryAccess = canAccessInventory(user ?? null);
  const authError = getInventoryAuthError(sessionToken, hasInventoryAccess);

  const query = useQuery({
    queryKey: inventoryKeys.dashboard(),
    queryFn: () => inventoryIpc.getDashboardData(),
    select: (data): InventoryStats => data.stats,
    enabled: !authError,
    retry: false,
  });

  return {
    stats: authError ? null : (query.data ?? null),
    loading: authError ? false : query.isLoading,
    error: authError ?? (query.error instanceof Error ? query.error.message : null),
    refetch: async () => {
      if (!authError) {
        await query.refetch();
      }
    },
  };
}
