import type { ClientWithTasks } from '@/shared/types';

export interface LocalClientStats {
  total: number;
  withTasks: number;
  individual: number;
  business: number;
}

/**
 * Compute summary stats from an already-loaded client list.
 */
export function computeClientStats(clients: ClientWithTasks[]): LocalClientStats {
  return clients.reduce<LocalClientStats>(
    (acc, client) => {
      acc.total += 1;
      if ((client.tasks || []).length > 0) {
        acc.withTasks += 1;
      }
      if (client.customer_type === 'individual') {
        acc.individual += 1;
      }
      if (client.customer_type === 'business') {
        acc.business += 1;
      }
      return acc;
    },
    { total: 0, withTasks: 0, individual: 0, business: 0 },
  );
}
