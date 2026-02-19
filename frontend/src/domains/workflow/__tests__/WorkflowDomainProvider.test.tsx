import { renderHook } from '@testing-library/react';

jest.mock('@/domains/tasks', () => ({}));
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

import { useWorkflowDomainContext } from '../api';

describe('WorkflowDomainProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useWorkflowDomainContext());
    }).toThrow('useWorkflowDomainContext must be used within WorkflowDomainProvider');
  });
});
