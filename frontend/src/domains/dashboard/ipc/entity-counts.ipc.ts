import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export interface EntityCountsResponse {
  tasks?: number;
  clients?: number;
  interventions?: number;
}

export const entityCountsIpc = {
  getCounts: (sessionToken: string) =>
    safeInvoke<EntityCountsResponse>(IPC_COMMANDS.GET_ENTITY_COUNTS, {
      sessionToken,
    }),
};
