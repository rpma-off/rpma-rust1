import { renderHook } from '@testing-library/react';
import { useAdminContext } from '../api';

describe('AdminProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAdminContext());
    }).toThrow('useAdminContext must be used within AdminProvider');
  });
});
