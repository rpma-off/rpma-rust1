"use client";

import { useQuery } from "@tanstack/react-query";
import { userKeys } from "@/lib/query-keys";
import { useAuth } from "@/shared/hooks/useAuth";
import { ipcClient } from "@/lib/ipc";
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
      const response = await ipcClient.users.list(limit, offset);
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
