"use client";

import { useQuery } from "@tanstack/react-query";
import { PAGINATION } from "@/lib/constants";
import { userKeys } from "@/lib/query-keys";
import { useAuth } from "@/shared/hooks/useAuth";
import type { UserAccount } from "@/types";
import { userIpc } from "../ipc/users.ipc";

export interface UseUserListReturn {
  users: UserAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Load the full user list via TanStack Query (ADR-014 compliant).
 *
 * Replaces the legacy useState+useEffect implementation with useQuery,
 * calling the IPC wrapper directly. The return shape is kept identical
 * so existing consumers (e.g. useUsersPage) continue to work unchanged.
 */
export function useUserList(
  limit = PAGINATION.USER_LIST_SIZE,
  offset = 0,
): UseUserListReturn {
  const { user } = useAuth();
  const isAuthenticated = !!user?.token;

  const query = useQuery({
    queryKey: userKeys.list(limit, offset),
    queryFn: async () => {
      const response = await userIpc.list(limit, offset);
      return (response?.data ?? []) as UserAccount[];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  return {
    users: query.data ?? [],
    loading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to load users"
      : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
