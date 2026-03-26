import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "@/lib/backend";
import { LogDomain } from "@/lib/logging/types";
import { clientKeys } from "@/lib/query-keys";
import { useLogger } from "@/shared/hooks/useLogger";
import { useAuth } from "@/shared/hooks/useAuth";
import { clientService } from "../services";

export interface UseClientOptions {
  clientId?: string;
  autoFetch?: boolean;
}

export interface UseClientReturn {
  client: Client | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setClientId: (clientId: string | undefined) => void;
}

export const useClient = (options: UseClientOptions = {}): UseClientReturn => {
  const { user } = useAuth();
  const { logInfo, logError } = useLogger({
    context: LogDomain.SYSTEM,
    component: "useClient",
  });
  const { clientId: initialClientId, autoFetch = true } = options;
  const [clientId, setClientId] = useState<string | undefined>(initialClientId);

  const {
    data: client = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: clientId
      ? clientKeys.withTasks(clientId)
      : ["clients", "__empty__"],
    queryFn: async () => {
      if (!clientId || !user?.token) return null;
      logInfo("Fetching client with tasks", { clientId });
      const response = await clientService.getClientWithTasks(
        clientId,
        user.token,
      );
      if (!response.success || !response.data) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : "Failed to fetch client",
        );
      }
      logInfo("Client fetched successfully", { clientId });
      return response.data as Client;
    },
    enabled: autoFetch && !!clientId && !!user?.token,
    staleTime: 60_000,
    meta: {
      onError: (err: unknown) => {
        logError(
          "Failed to fetch client",
          err instanceof Error ? err : new Error(String(err)),
          { clientId },
        );
      },
    },
  });

  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    client,
    loading: isLoading,
    error: error instanceof Error ? error : null,
    refetch: handleRefetch,
    setClientId,
  };
};
