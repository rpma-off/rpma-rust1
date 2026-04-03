"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authKeys } from "@/lib/query-keys";
import { bootstrapIpc } from "@/domains/bootstrap/ipc/bootstrap.ipc";
import {
  structuredLogger as logger,
  LogDomain,
} from "@/shared/utils";

export function useAdminBootstrapCheck(
  user: { user_id: string } | null,
  authLoading: boolean,
  isAuthenticating: boolean,
) {
  const router = useRouter();
  const pathname = usePathname();

  const isReady = !authLoading && !isAuthenticating && !!user;

  const {
    data: hasAdmins,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: authKeys.hasAdmins(),
    queryFn: () => bootstrapIpc.hasAdmins(),
    enabled: isReady,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isReady || !user) return;

    const isOnAuthPage = pathname === "/login" || pathname === "/signup";

    if (isSuccess) {
      logger.debug(LogDomain.AUTH, "Admin check result", {
        has_admins: hasAdmins,
        pathname,
        user_id: user.user_id,
      });

      if (!hasAdmins && pathname !== "/bootstrap-admin") {
        logger.info(LogDomain.AUTH, "Redirecting to /bootstrap-admin", {
          pathname,
          user_id: user.user_id,
        });
        router.push("/bootstrap-admin");
      } else if (isOnAuthPage && hasAdmins) {
        logger.info(
          LogDomain.AUTH,
          "Redirecting to /dashboard from login/signup",
          {
            pathname,
            user_id: user.user_id,
          },
        );
        router.push("/dashboard");
      } else if (isOnAuthPage && !hasAdmins) {
        logger.info(
          LogDomain.AUTH,
          "Redirecting to /bootstrap-admin from login/signup",
          {
            pathname,
            user_id: user.user_id,
          },
        );
        router.push("/bootstrap-admin");
      } else {
        logger.debug(LogDomain.AUTH, "No redirect needed", {
          has_admins: hasAdmins,
          pathname,
          user_id: user.user_id,
        });
      }
    }

    if (isError) {
      logger.error(LogDomain.AUTH, "Failed to check admin status", error, {
        pathname,
        user_id: user.user_id,
      });
      if (isOnAuthPage) {
        router.push("/dashboard");
      }
    }
  }, [user, isReady, hasAdmins, isSuccess, isError, error, pathname, router]);
}
