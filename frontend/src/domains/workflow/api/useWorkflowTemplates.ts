'use client';

import { useWorkflowTemplate } from '../hooks/useWorkflowTemplate';

export function useWorkflowTemplates(taskType: string = 'ppf_installation') {
  return useWorkflowTemplate(taskType);
}
