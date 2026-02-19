'use client';

import useWorkflow from '../hooks/useWorkflow';

export function useWorkflowExecution(taskId: string, autoFetch: boolean = true) {
  return useWorkflow({ taskId, autoFetch });
}
