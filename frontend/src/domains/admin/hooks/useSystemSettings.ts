import { useState, type Dispatch, type SetStateAction } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminKeys } from "@/lib/query-keys";
import { useAuth } from "@/shared/hooks/useAuth";
import { ConfigurationItem, BusinessHoursConfig } from "@/shared/types";
import type { JsonValue, JsonObject } from "@/shared/types";
import { settingsOperations } from "@/shared/utils";

const inferDataType = (value: JsonValue): "boolean" | "number" | "string" => {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
};

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  enabled: true,
  timezone: "Europe/Paris",
  schedule: {
    monday: { start: "08:00", end: "18:00", enabled: true },
    tuesday: { start: "08:00", end: "18:00", enabled: true },
    wednesday: { start: "08:00", end: "18:00", enabled: true },
    thursday: { start: "08:00", end: "18:00", enabled: true },
    friday: { start: "08:00", end: "18:00", enabled: true },
    saturday: { start: "09:00", end: "13:00", enabled: false },
    sunday: { start: "00:00", end: "00:00", enabled: false },
  },
};

export function useSystemSettings() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [pendingConfigurations, setPendingConfigurations] = useState<
    ConfigurationItem[] | null
  >(null);
  const [pendingBusinessHours, setPendingBusinessHours] =
    useState<BusinessHoursConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: serverData, isLoading: loading } = useQuery({
    queryKey: adminKeys.appSettings(),
    queryFn: () => settingsOperations.getAppSettings(),
    enabled: !!session?.token,
    staleTime: 60_000,
    select: (data) => {
      const appSettings = data as Record<string, JsonValue>;
      const generalSettings = (appSettings?.general || {}) as Record<
        string,
        JsonValue
      >;
      const configs: ConfigurationItem[] = Object.entries(generalSettings).map(
        ([key, value]) => ({
          id: `general-${key}`,
          category: "general",
          key,
          value: value as string | number | boolean,
          description: key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          data_type: inferDataType(value),
          is_required: false,
          isRequired: false,
          system_level: true,
          created_at: "",
          updated_at: "",
        }),
      );
      const storedHours = appSettings?.business_hours as unknown as
        | BusinessHoursConfig
        | undefined;
      const businessHours = storedHours?.schedule
        ? storedHours
        : DEFAULT_BUSINESS_HOURS;
      return { configs, businessHours };
    },
  });

  // Prefer locally-edited state; fall back to server data
  const configurations = pendingConfigurations ?? serverData?.configs ?? [];
  const businessHours =
    pendingBusinessHours ?? serverData?.businessHours ?? DEFAULT_BUSINESS_HOURS;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updateRequest: Record<
        string,
        string | number | boolean | undefined
      > = {};
      for (const config of configurations) {
        updateRequest[config.key] = config.value;
      }
      await settingsOperations.updateGeneralSettings(
        updateRequest as unknown as JsonObject,
      );
      if (businessHours) {
        await settingsOperations.updateBusinessHours(
          businessHours as unknown as JsonObject,
        );
      }
    },
    onSuccess: () => {
      toast.success("Configurations sauvegardées avec succès");
      setHasChanges(false);
      setPendingConfigurations(null);
      setPendingBusinessHours(null);
      void queryClient.invalidateQueries({ queryKey: adminKeys.appSettings() });
    },
    onError: (error) => {
      toast.error(
        `Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
    },
  });

  const reset = async () => {
    setPendingConfigurations(null);
    setPendingBusinessHours(null);
    setHasChanges(false);
    await queryClient.invalidateQueries({ queryKey: adminKeys.appSettings() });
  };

  const updateConfiguration = (
    id: string,
    value: string | number | boolean,
  ) => {
    setPendingConfigurations((prev) =>
      (prev ?? configurations).map((c) => (c.id === id ? { ...c, value } : c)),
    );
    setHasChanges(true);
  };

  const setBusinessHoursLocal = (
    update: SetStateAction<BusinessHoursConfig>,
  ) => {
    setPendingBusinessHours((prev) => {
      const current =
        prev ?? serverData?.businessHours ?? DEFAULT_BUSINESS_HOURS;
      const next = typeof update === "function" ? update(current) : update;
      return next;
    });
    setHasChanges(true);
  };

  return {
    configurations,
    businessHours,
    loading,
    saving: saveMutation.isPending,
    resetting: false,
    hasChanges,
    loadConfigurations: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.appSettings(),
      });
    },
    loadBusinessHours: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.appSettings(),
      });
    },
    save: () => saveMutation.mutateAsync(),
    reset,
    updateConfiguration,
    setBusinessHours: setBusinessHoursLocal as Dispatch<
      SetStateAction<BusinessHoursConfig>
    >,
    setHasChanges,
  };
}
