import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminKeys } from "@/lib/query-keys";
import { ipcClient } from "@/lib/ipc";
import { makeMutationErrorHandler } from "./mutation-error";
import type {
  BackendIntegrationConfig,
  IntegrationConfig,
  TestBackendIntegrationResponse,
} from "@/shared/types";

function toUiIntegration(
  integration: BackendIntegrationConfig,
  testResult?: TestBackendIntegrationResponse | null,
): IntegrationConfig {
  const endpointHost = (() => {
    try {
      return new URL(integration.endpoint_url).host;
    } catch {
      return integration.endpoint_url;
    }
  })();

  return {
    id: integration.id,
    type: "webhook",
    name: integration.name,
    config: {},
    status:
      integration.status === "active"
        ? "active"
        : integration.status === "disabled"
          ? "inactive"
          : "pending",
    provider: endpointHost,
    isActive: integration.status === "active",
    settings: {
      url: integration.endpoint_url,
      subscribedEvents: integration.subscribed_events.join(", "),
      hasSecret: integration.has_secret,
    },
    createdAt: new Date(integration.created_at).toISOString(),
    updatedAt: new Date(integration.updated_at).toISOString(),
    lastSync: integration.last_tested_at
      ? new Date(integration.last_tested_at).toISOString()
      : undefined,
    healthCheck: testResult
      ? {
          status: testResult.success ? "healthy" : "unhealthy",
          lastChecked: new Date(testResult.tested_at).toISOString(),
          error: testResult.success ? undefined : testResult.message,
        }
      : undefined,
  };
}

export function useIntegrations() {
  const queryClient = useQueryClient();

  const {
    data: backendIntegrations = [],
    isLoading: loading,
    refetch: refresh,
  } = useQuery({
    queryKey: adminKeys.integrations(),
    queryFn: () => ipcClient.integrations.list(),
    staleTime: 60_000,
  });

  const integrations = backendIntegrations.map((integration) =>
    toUiIntegration(integration),
  );

  const saveMutation = useMutation({
    mutationFn: async ({
      current,
      previous,
      successMessage,
    }: {
      current: IntegrationConfig;
      previous?: IntegrationConfig | null;
      successMessage: string;
    }) => {
      if (current.type !== "webhook") {
        throw new Error("Seules les intégrations webhook sont supportées en V1.");
      }

      const subscribedEvents =
        typeof current.settings?.subscribedEvents === "string"
          ? current.settings.subscribedEvents
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : ["task_created"];

      const request = {
        name: current.name,
        description: current.provider ?? null,
        endpoint_url: String(current.settings?.url ?? ""),
        headers: {},
        subscribed_events: subscribedEvents,
        secret_token:
          typeof current.credentials?.data === "string" &&
          current.credentials.data.length > 0
            ? current.credentials.data
            : null,
      } as const;

      if (previous?.id) {
        await ipcClient.integrations.update(previous.id, {
          ...request,
          status: current.isActive ? "active" : "disabled",
        });
      } else {
        const created = await ipcClient.integrations.create(request);
        if (current.isActive) {
          await ipcClient.integrations.update(created.id, { status: "active" });
        }
      }

      return successMessage;
    },
    onSuccess: (successMessage) => {
      toast.success(successMessage);
      void queryClient.invalidateQueries({ queryKey: adminKeys.integrations() });
    },
    onError: makeMutationErrorHandler("la sauvegarde"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => ipcClient.integrations.delete(id),
    onSuccess: () => {
      toast.success("Intégration supprimée avec succès");
      void queryClient.invalidateQueries({ queryKey: adminKeys.integrations() });
    },
    onError: makeMutationErrorHandler("la suppression"),
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => ipcClient.integrations.test(id),
  });

  const persistIntegration = useCallback(
    (
      current: IntegrationConfig,
      successMessage: string,
      previous?: IntegrationConfig | null,
    ) => saveMutation.mutateAsync({ current, previous, successMessage }),
    [saveMutation],
  );

  const deleteIntegration = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  const testIntegration = useCallback(
    async (id: string) => {
      const response = await testMutation.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: adminKeys.integrations() });
      return response;
    },
    [queryClient, testMutation],
  );

  return {
    integrations,
    loading,
    saving: saveMutation.isPending || deleteMutation.isPending,
    testing: testMutation.isPending,
    refresh,
    persistIntegration,
    deleteIntegration,
    testIntegration,
    backendIntegrations,
  };
}
