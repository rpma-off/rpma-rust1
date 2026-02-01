import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';

/**
 * Dashboard statistics and analytics operations
 */
export const dashboardOperations = {
  /**
   * Gets dashboard statistics
   * @param timeRange - Time range for statistics ('day', 'week', 'month', 'year')
   * @returns Promise resolving to dashboard statistics
   */
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