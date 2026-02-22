import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export const dashboardIpc = {
  getStats: (timeRange?: 'day' | 'week' | 'month' | 'year'): Promise<{
    tasks?: { total?: number; completed?: number; pending?: number; active?: number };
    clients?: { total?: number; active?: number };
    users?: { total?: number; active?: number; admins?: number; technicians?: number };
    sync?: { status?: string; pending_operations?: number; completed_operations?: number }
  }> =>
    safeInvoke<{
      tasks?: { total?: number; completed?: number; pending?: number; active?: number };
      clients?: { total?: number; active?: number };
      users?: { total?: number; active?: number; admins?: number; technicians?: number };
      sync?: { status?: string; pending_operations?: number; completed_operations?: number }
    }>(IPC_COMMANDS.DASHBOARD_GET_STATS, { timeRange }),
};
