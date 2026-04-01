import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminIpc } from "../ipc/admin.ipc";
import { adminKeys } from "@/lib/query-keys";
import type { SystemStatus } from "@/shared/types";
import type { JsonValue } from "@/shared/types";

export interface UseSystemHealthOptions {
  /** Polling interval in ms (default: 30000) */
  pollInterval?: number;
  /** Whether to start polling automatically (default: true) */
  autoStart?: boolean;
}

export interface UseSystemHealthReturn {
  systemStatus: "healthy" | "warning" | "error";
  statusDetails: SystemStatus | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

function parseHealthResult(result: JsonValue | null): SystemStatus | null {
  if (!result || typeof result !== "object" || !("status" in result)) {
    return null;
  }

  const healthData = result as Record<string, JsonValue>;
  const overallStatus =
    (healthData.status as string) === "healthy"
      ? ("healthy" as const)
      : ("warning" as const);
  const now = new Date().toISOString();

  const components: Record<
    string,
    {
      status: "healthy" | "warning" | "error";
      message?: string;
      lastChecked: string;
    }
  > = {};

  if (healthData.components && typeof healthData.components === "object") {
    for (const [key, val] of Object.entries(
      healthData.components as Record<string, JsonValue>,
    )) {
      const comp = val as Record<string, JsonValue>;
      components[key] = {
        status:
          (comp.status as string) === "healthy"
            ? "healthy"
            : (comp.status as string) === "warning"
              ? "warning"
              : "error",
        message: (comp.message as string) || "",
        lastChecked: (comp.lastChecked as string) || now,
      };
    }
  }

  return { status: overallStatus, components, timestamp: now };
}

const HEALTH_QUERY_KEY = [...adminKeys.all, "system-health"] as const;

export function useSystemHealth(
  options: UseSystemHealthOptions = {},
): UseSystemHealthReturn {
  const { pollInterval = 30_000, autoStart = true } = options;
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: () => adminIpc.getHealthStatus(),
    enabled: autoStart,
    staleTime: Math.max(pollInterval - 5_000, 5_000),
    // TanStack Query stops polling when the browser tab is hidden by default
    // when refetchIntervalInBackground is false (the default), matching the
    // previous `document.visibilityState === 'visible'` guard.
    refetchInterval: autoStart ? pollInterval : false,
    refetchIntervalInBackground: false,
  });

  const statusDetails = parseHealthResult((data as JsonValue) ?? null);
  const systemStatus: "healthy" | "warning" | "error" = isError
    ? "error"
    : (statusDetails?.status ?? "healthy");

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEY });
  }, [queryClient]);

  return {
    systemStatus,
    statusDetails,
    // `isLoading` is true only for the very first fetch (no cached data).
    loading: isLoading,
    // `isFetching && !isLoading` means a background refetch / manual refresh
    // is in flight while stale data is already shown.
    refreshing: isFetching && !isLoading,
    refresh,
  };
}
