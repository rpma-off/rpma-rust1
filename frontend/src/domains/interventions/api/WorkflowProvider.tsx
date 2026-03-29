'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { PPFInterventionData } from '@/types/ppf-intervention';
import { useWorkflowData } from './useWorkflowData';
import type { WorkflowContextType } from './workflow-provider.types';

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({
  children,
  taskId,
  initialWorkflow,
}: {
  children: ReactNode;
  taskId: string;
  initialWorkflow?: PPFInterventionData | null;
}) {
  const workflowData = useWorkflowData({ taskId, initialWorkflow });
  const value = useMemo(() => workflowData, [workflowData]);

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextType {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
