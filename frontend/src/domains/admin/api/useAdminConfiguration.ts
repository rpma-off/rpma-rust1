"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { configurationService } from "../server";
import type { AdminConfiguration, AdminConfigurationState } from "./types";

export function useAdminConfiguration(
  category?: string,
): AdminConfigurationState {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.configuration(category),
    queryFn: async () => {
      const response = await configurationService.getSystemConfigurations(
        category ? { category } : undefined,
      );
      if (!response.success) {
        throw new Error(response.error ?? "Failed to load admin configuration");
      }
      return (response.data ?? []) as AdminConfiguration[];
    },
    staleTime: 60_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminKeys.configuration(category),
    });
  };

  return {
    configurations: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh,
  };
}
