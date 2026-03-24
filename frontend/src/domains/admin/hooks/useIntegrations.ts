import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsOperations } from "@/shared/utils";
import { adminKeys } from "@/lib/query-keys";
import type { JsonValue } from "@/shared/types";
import { IntegrationConfig } from "@/shared/types";
import { useAuth } from "@/shared/hooks/useAuth";

export function useIntegrations() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!session?.token;

  const {
    data: integrations = [],
    isLoading: loading,
    refetch: refresh,
  } = useQuery({
    queryKey: adminKeys.appSettings(),
    queryFn: () => settingsOperations.getAppSettings(),
    enabled,
    staleTime: 60_000,
    select: (data) => {
      const appSettings = data as Record<string, JsonValue>;
      const configs = (appSettings?.integrations ||
        []) as unknown as IntegrationConfig[];
      return Array.isArray(configs) ? configs : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      nextIntegrations,
      successMessage,
    }: {
      nextIntegrations: IntegrationConfig[];
      successMessage: string;
    }) => {
      await settingsOperations.updateGeneralSettings({
        integrations: nextIntegrations as unknown as JsonValue,
      } as Record<string, JsonValue>);
      return successMessage;
    },
    onSuccess: (successMessage) => {
      toast.success(successMessage);
      void queryClient.invalidateQueries({ queryKey: adminKeys.appSettings() });
    },
    onError: (error) => {
      console.error("Error saving integrations:", error);
      toast.error("Erreur lors de la sauvegarde");
    },
  });

  const persistIntegrations = useCallback(
    (nextIntegrations: IntegrationConfig[], successMessage: string) =>
      saveMutation.mutateAsync({ nextIntegrations, successMessage }),
    [saveMutation],
  );

  return {
    integrations,
    loading,
    saving: saveMutation.isPending,
    refresh,
    persistIntegrations,
  };
}
