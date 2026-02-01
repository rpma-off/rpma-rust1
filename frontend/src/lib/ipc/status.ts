import { invoke } from '@tauri-apps/api/core';
import type {
  StatusTransitionRequest,
  StatusDistribution
} from '@/lib/backend';

export const statusApi = {
  /**
   * Transition a task to a new status
   */
  transitionStatus: async (request: StatusTransitionRequest) => {
    return invoke('task_transition_status', { request });
  },

  /**
   * Get status distribution for all tasks
   */
  getStatusDistribution: async (): Promise<StatusDistribution> => {
    return invoke('task_get_status_distribution');
  },
};