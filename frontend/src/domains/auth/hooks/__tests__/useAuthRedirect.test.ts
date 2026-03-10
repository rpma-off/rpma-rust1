import { renderHook, waitFor } from '@testing-library/react';
import { useAuthRedirect } from '../useAuthRedirect';

const push = jest.fn();
const usePathnameMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => usePathnameMock(),
}));

describe('useAuthRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue('/dashboard');
  });

  it('does not redirect while auth state is hydrating', async () => {
    renderHook(() => useAuthRedirect(null, false, false, true));

    await waitFor(() => {
      expect(push).not.toHaveBeenCalled();
    });
  });

  it('redirects to login after hydration for protected routes', async () => {
    renderHook(() => useAuthRedirect(null, false, false, false));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login');
    });
  });
});
