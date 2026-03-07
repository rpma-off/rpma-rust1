import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { InterventionReport } from '@/lib/backend/reports';

export const reportsIpc = {
  generate: async (interventionId: string) => {
    const result = await safeInvoke<InterventionReport>(IPC_COMMANDS.REPORT_GENERATE, {
      intervention_id: interventionId,
    });
    invalidatePattern('report:');
    signalMutation('reports');
    return result;
  },

  get: (reportId: string) =>
    safeInvoke<InterventionReport | null>(IPC_COMMANDS.REPORT_GET, {
      report_id: reportId,
    }),

  getByIntervention: (interventionId: string) =>
    safeInvoke<InterventionReport | null>(IPC_COMMANDS.REPORT_GET_BY_INTERVENTION, {
      intervention_id: interventionId,
    }),

  list: (limit?: number, offset?: number) =>
    safeInvoke<InterventionReport[]>(IPC_COMMANDS.REPORT_LIST, {
      limit: limit ?? 50,
      offset: offset ?? 0,
    }),
};
