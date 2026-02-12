import { invoke } from '@tauri-apps/api/core';
import type {
  StatusTransitionRequest,
  StatusDistribution
} from '@/lib/backend';

export const statusApi = {
  /**
   * Transition a task to a new status
   */
  transitionStatus: async (request: StatusTransitionRequest, sessionToken: string) => {
    return invoke('task_transition_status', { session_token: sessionToken, request });
  },

  /**
   * Get status distribution for all tasks
   */
  getStatusDistribution: async (sessionToken: string): Promise<StatusDistribution> => {
    return invoke('task_get_status_distribution', { session_token: sessionToken });
  },
};