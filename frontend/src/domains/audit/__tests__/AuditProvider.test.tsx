import { renderHook } from '@testing-library/react';
import { AuditProvider, useAuditContext } from '../api/AuditProvider';

jest.mock('../server', () => ({
  changeLogService: {
    getRecordChanges: jest.fn(),
    getTableChanges: jest.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuditProvider>{children}</AuditProvider>;
}

describe('AuditProvider', () => {
  it('throws when useAuditContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuditContext())).toThrow(
      'useAuditContext must be used within AuditProvider'
    );
  });

  it('provides changeLogService to consumers', () => {
    const { result } = renderHook(() => useAuditContext(), { wrapper });

    expect(result.current.changeLogService).toBeDefined();
    expect(result.current.changeLogService.getRecordChanges).toBeDefined();
  });
});
