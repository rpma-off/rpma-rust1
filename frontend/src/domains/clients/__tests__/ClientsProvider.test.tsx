import { renderHook } from '@testing-library/react';
import { useClientsContext } from '../api';

describe('ClientsProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useClientsContext());
    }).toThrow('useClientsContext must be used within ClientsProvider');
  });
});
