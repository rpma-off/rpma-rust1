import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { structuredLogger as logger, LogDomain } from '@/shared/utils';

export function useAdminBootstrapCheck(
  user: { user_id: string } | null,
  authLoading: boolean,
  isAuthenticating: boolean
) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading || isAuthenticating || !user) return;

    const check = async () => {
      const isOnAuthPage = pathname === '/login' || pathname === '/signup';
      logger.debug(LogDomain.AUTH, 'Admin redirect check started', {
        pathname,
        user_id: user.user_id,
      });
      try {
        const { ipcClient } = await import('@/shared/utils');
        const hasAdmins = await ipcClient.bootstrap.hasAdmins();
        logger.debug(LogDomain.AUTH, 'Admin check result', {
          has_admins: hasAdmins,
          pathname,
          user_id: user.user_id,
        });

        if (!hasAdmins && pathname !== '/bootstrap-admin') {
          logger.info(LogDomain.AUTH, 'Redirecting to /bootstrap-admin', {
            pathname,
            user_id: user.user_id,
          });
          router.push('/bootstrap-admin');
        } else if (isOnAuthPage && hasAdmins) {
          logger.info(LogDomain.AUTH, 'Redirecting to /dashboard from login/signup', {
            pathname,
            user_id: user.user_id,
          });
          router.push('/dashboard');
        } else if (isOnAuthPage && !hasAdmins) {
          logger.info(LogDomain.AUTH, 'Redirecting to /bootstrap-admin from login/signup', {
            pathname,
            user_id: user.user_id,
          });
          router.push('/bootstrap-admin');
        } else {
          logger.debug(LogDomain.AUTH, 'No redirect needed', {
            has_admins: hasAdmins,
            pathname,
            user_id: user.user_id,
          });
        }
      } catch (error) {
        logger.error(LogDomain.AUTH, 'Failed to check admin status', error, {
          pathname,
          user_id: user.user_id,
        });
        if (isOnAuthPage) {
          router.push('/dashboard');
        }
      }
    };

    check();
  }, [user, authLoading, isAuthenticating, pathname, router]);
}
