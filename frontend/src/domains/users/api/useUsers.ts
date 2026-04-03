"use client";

import { useQuery } from "@tanstack/react-query";
import { userKeys } from "@/lib/query-keys";
import { useAuth } from "@/shared/hooks/useAuth";
import { userIpc } from "../ipc/users.ipc";
import type { UseUsersResult } from "./types";

export function useUsers(
  limit: number = 50,
  offset: number = 0,
): UseUsersResult {
  const { user } = useAuth();
  const isAuthenticated = !!user?.token;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: userKeys.list(limit, offset),
    queryFn: async () => {
      const response = await userIpc.list(limit, offset);
      return response?.data ?? [];
    },
    enabled: isAuthenticated,
  });

  return {
    users: data ?? [],
    loading: isLoading,
    error: !isAuthenticated
      ? "Authentication required"
      : error
        ? error instanceof Error
          ? error.message
          : "Failed to load users"
        : null,
    refetch: async () => {
      await refetch();
    },
  };
}
