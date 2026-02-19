'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  workflowService,
  workflowTemplatesService,
  taskWorkflowSyncService,
} from '../server';

interface WorkflowDomainContextValue {
  workflowService: typeof workflowService;
  workflowTemplatesService: typeof workflowTemplatesService;
  taskWorkflowSyncService: typeof taskWorkflowSyncService;
}

const WorkflowDomainContext = createContext<WorkflowDomainContextValue | null>(null);

export function WorkflowDomainProvider({ children }: { children: ReactNode }) {
  const value = useMemo<WorkflowDomainContextValue>(
    () => ({
      workflowService,
      workflowTemplatesService,
      taskWorkflowSyncService,
    }),
    []
  );

  return (
    <WorkflowDomainContext.Provider value={value}>
      {children}
    </WorkflowDomainContext.Provider>
  );
}

export function useWorkflowDomainContext(): WorkflowDomainContextValue {
  const context = useContext(WorkflowDomainContext);
  if (!context) {
    throw new Error('useWorkflowDomainContext must be used within WorkflowDomainProvider');
  }
  return context;
}
