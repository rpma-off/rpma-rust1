import { renderHook } from '@testing-library/react';
import { useAuthActions } from '../api/useAuthActions';
import { useAuth } from '../api/useAuth';

jest.mock('../api/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('useAuthActions', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes auth action methods from useAuth', () => {
    const signIn = jest.fn();
    const signUp = jest.fn();
    const signOut = jest.fn();
    const refreshProfile = jest.fn();

    mockUseAuth.mockReturnValue({
      signIn,
      signUp,
      signOut,
      refreshProfile,
    } as never);

    const { result } = renderHook(() => useAuthActions());

    result.current.signIn('user@example.com', 'password');
    result.current.signUp({ email: 'user@example.com', password: 'password' } as never);
    result.current.signOut();
    result.current.refreshProfile();

    expect(signIn).toHaveBeenCalledWith('user@example.com', 'password');
    expect(signUp).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(refreshProfile).toHaveBeenCalled();
  });
});
