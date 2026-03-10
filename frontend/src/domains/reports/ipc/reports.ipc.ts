import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { InterventionReport } from '@/lib/backend/reports';

// Re-export so domain-internal files (hooks, services) can import the backend
// type through this IPC layer instead of referencing @/lib/backend directly.
export type { InterventionReport };

export const reportsIpc = {
  generate: async (interventionId: string) => {
    const result = await safeInvoke<InterventionReport>(IPC_COMMANDS.REPORT_GENERATE, {
      interventionId,
    });
    invalidatePattern('report:');
    signalMutation('reports');
    return result;
  },

  get: (reportId: string) =>
    safeInvoke<InterventionReport | null>(IPC_COMMANDS.REPORT_GET, {
      reportId,
    }),

  getByIntervention: (interventionId: string) =>
    safeInvoke<InterventionReport | null>(IPC_COMMANDS.REPORT_GET_BY_INTERVENTION, {
      interventionId,
    }),

  list: (limit?: number, offset?: number) =>
    safeInvoke<InterventionReport[]>(IPC_COMMANDS.REPORT_LIST, {
      limit: limit ?? 50,
      offset: offset ?? 0,
    }),
};
