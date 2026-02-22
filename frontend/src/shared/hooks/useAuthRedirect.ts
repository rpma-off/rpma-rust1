import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PUBLIC_ROUTES = ['/login', '/signup', '/unauthorized', '/bootstrap-admin'];

export function useAuthRedirect(
  user: unknown,
  authLoading: boolean,
  isAuthenticating: boolean
) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !isAuthenticating && !user && !PUBLIC_ROUTES.includes(pathname)) {
      router.push('/login');
    }
  }, [user, authLoading, isAuthenticating, pathname, router]);

  return { shouldShowNavigation: !!user && !PUBLIC_ROUTES.includes(pathname) };
}
