import { renderHook } from '@testing-library/react';
import { useReportsContext } from '../api';

describe('ReportsProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useReportsContext());
    }).toThrow('useReportsContext must be used within ReportsProvider');
  });
});
