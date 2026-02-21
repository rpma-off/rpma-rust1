import { renderHook } from '@testing-library/react';
import { UsersProvider, useUsersContext } from '../api/UsersProvider';

jest.mock('../api/useUsers', () => ({
  useUsers: () => ({
    users: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../api/useUserActions', () => ({
  useUserActions: () => ({
    createUser: jest.fn(),
    updateUser: jest.fn(),
    saving: false,
    error: null,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <UsersProvider>{children}</UsersProvider>;
}

describe('UsersProvider', () => {
  it('throws when useUsersContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useUsersContext())).toThrow(
      'useUsersContext must be used within UsersProvider'
    );
  });

  it('provides users state and actions to consumers', () => {
    const { result } = renderHook(() => useUsersContext(), { wrapper });

    expect(result.current.usersState).toBeDefined();
    expect(result.current.actions).toBeDefined();
    expect(result.current.usersState.loading).toBe(false);
  });
});
