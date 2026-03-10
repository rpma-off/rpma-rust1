import { safeInvoke } from './utils';
import { IPC_COMMANDS } from './commands';
import type {
  StatusTransitionRequest,
  StatusDistribution
} from '@/lib/backend';

export const statusApi = {
  /**
   * Transition a task to a new status
   */
  transitionStatus: async (request: StatusTransitionRequest) => {
    return safeInvoke(IPC_COMMANDS.TASK_TRANSITION_STATUS, { request });
  },

  /**
   * Get status distribution for all tasks
   */
  getStatusDistribution: async (): Promise<StatusDistribution> => {
    return safeInvoke(IPC_COMMANDS.TASK_GET_STATUS_DISTRIBUTION, {});
  },
};
