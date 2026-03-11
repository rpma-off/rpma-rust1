'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { structuredLogger as logger, LogDomain } from '@/shared/utils';

const ONBOARDING_ROUTE = '/onboarding';
const SKIP_ONBOARDING_ROUTES = [ONBOARDING_ROUTE, '/login', '/signup', '/bootstrap-admin'];

export function useOnboardingCheck(
  user: { user_id: string } | null,
  authLoading: boolean,
  isAuthenticating: boolean
) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (authLoading || isAuthenticating || !user) return;

    const check = async () => {
      if (SKIP_ONBOARDING_ROUTES.includes(pathname)) {
        return;
      }

      setChecking(true);
      logger.debug(LogDomain.AUTH, 'Onboarding check started', {
        pathname,
        user_id: user.user_id,
      });

      try {
        const { organizationIpc } = await import('@/domains/organizations/ipc/organization.ipc');
        const status = await organizationIpc.getOnboardingStatus();

        logger.debug(LogDomain.AUTH, 'Onboarding check result', {
          completed: status.completed,
          has_organization: status.has_organization,
          has_admin_user: status.has_admin_user,
          pathname,
          user_id: user.user_id,
        });

        if (!status.completed && pathname !== ONBOARDING_ROUTE) {
          logger.info(LogDomain.AUTH, 'Redirecting to onboarding', {
            pathname,
            user_id: user.user_id,
          });
          router.push(ONBOARDING_ROUTE);
        }
      } catch (error) {
        logger.error(LogDomain.AUTH, 'Failed to check onboarding status', error, {
          pathname,
          user_id: user.user_id,
        });
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [user, authLoading, isAuthenticating, pathname, router]);

  return { checking };
}
