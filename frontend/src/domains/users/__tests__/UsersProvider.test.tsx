import { renderHook } from '@testing-library/react';
import { useUsersContext } from '../api';

describe('UsersProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useUsersContext());
    }).toThrow('useUsersContext must be used within UsersProvider');
  });
});
