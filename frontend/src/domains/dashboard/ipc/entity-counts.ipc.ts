import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { EntityCountsResponse } from '@/lib/backend.ts';

export const entityCountsIpc = {
  getCounts: () =>
    safeInvoke<EntityCountsResponse>(IPC_COMMANDS.GET_ENTITY_COUNTS, {}),
};
