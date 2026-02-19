import { renderHook } from '@testing-library/react';
import { useAuditContext } from '../api';

describe('AuditProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuditContext());
    }).toThrow('useAuditContext must be used within AuditProvider');
  });
});
