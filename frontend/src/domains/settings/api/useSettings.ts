"use client";

import { useQuery } from "@tanstack/react-query";
import { useIpcClient } from "@/lib/ipc/client";
import { userSettingsKeys } from "@/lib/query-keys";
import type { UserSettings } from "@/lib/backend";
import { useAuth } from "@/shared/hooks/useAuth";

export function useSettings() {
  const { user } = useAuth();
  const ipcClient = useIpcClient();

  const query = useQuery<UserSettings>({
    queryKey: userSettingsKeys.byUser(user?.user_id),
    queryFn: () => ipcClient.settings.getUserSettings(),
    enabled: !!user?.token,
    staleTime: 30_000,
  });

  return {
    settings: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
