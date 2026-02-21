import { renderHook } from '@testing-library/react';
import {
  WorkflowDomainProvider,
  useWorkflowDomainContext,
} from '../api/WorkflowDomainProvider';

jest.mock('../server', () => ({
  workflowService: { getWorkflows: jest.fn() },
  workflowTemplatesService: { getTemplates: jest.fn() },
  taskWorkflowSyncService: { syncWorkflow: jest.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <WorkflowDomainProvider>{children}</WorkflowDomainProvider>;
}

describe('WorkflowDomainProvider', () => {
  it('throws when useWorkflowDomainContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useWorkflowDomainContext())).toThrow(
      'useWorkflowDomainContext must be used within WorkflowDomainProvider'
    );
  });

  it('provides workflow services to consumers', () => {
    const { result } = renderHook(() => useWorkflowDomainContext(), { wrapper });

    expect(result.current.workflowService).toBeDefined();
    expect(result.current.workflowTemplatesService).toBeDefined();
    expect(result.current.taskWorkflowSyncService).toBeDefined();
  });
});
