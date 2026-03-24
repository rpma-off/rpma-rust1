import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PerformanceConfig,
  PerformanceCategory,
  CreatePerformanceConfigDTO,
} from "@/shared/types";
import { settingsOperations } from "@/shared/utils";
import { adminKeys } from "@/lib/query-keys";
import type { JsonValue } from "@/shared/types";
import { useAuth } from "@/shared/hooks/useAuth";

const DEFAULT_FORM_DATA: CreatePerformanceConfigDTO = {
  category: "caching" as PerformanceCategory,
  name: "",
  value: null,
  isActive: true,
  settings: {
    enabled: true,
    ttlSeconds: 3600,
    maxSizeMb: 100,
    strategy: "lru" as const,
    connectionPoolSize: 10,
    queryTimeoutSeconds: 30,
    maxConnections: 100,
    compressionEnabled: true,
    rateLimitPerHour: 1000,
    timeoutSeconds: 30,
  },
  thresholds: {
    queryTimeThreshold: { value: 200, unit: "ms" },
    connectionUsageThreshold: { value: 80, unit: "percent" },
    hitRateThreshold: { value: 85, unit: "percent" },
    missRateThreshold: { value: 15, unit: "percent" },
    uploadTimeThreshold: { value: 30, unit: "seconds" },
    fileSizeThreshold: { value: 10, unit: "mb" },
  },
  monitoring: {
    enabled: true,
    interval: 60,
    intervalSeconds: 60,
    retention_days: 30,
    metrics: ["response_time", "cpu_usage", "memory_usage", "error_rate"],
  },
  alerts: [
    {
      metric: "cpu_usage",
      threshold: 80,
      action: "alert" as const,
      recipients: ["admin@company.com"],
    },
    {
      metric: "memory_usage",
      threshold: 85,
      action: "email" as const,
      recipients: ["admin@company.com"],
    },
  ],
};

export function usePerformanceConfig() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PerformanceConfig | null>(
    null,
  );
  const [activeSubTab, setActiveSubTab] = useState("caching");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] =
    useState<PerformanceConfig | null>(null);
  const [formData, setFormData] = useState<CreatePerformanceConfigDTO>({
    ...DEFAULT_FORM_DATA,
  });

  const { data: performanceConfigs = [], isLoading: loading } = useQuery({
    queryKey: adminKeys.appSettings(),
    queryFn: () => settingsOperations.getAppSettings(),
    enabled: !!session?.token,
    staleTime: 60_000,
    select: (data) => {
      const appSettings = data as Record<string, JsonValue>;
      const configs = (appSettings?.performance_configs ||
        []) as unknown as PerformanceConfig[];
      return Array.isArray(configs) ? configs : [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.appSettings() });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const newConfig: PerformanceConfig = {
        id: editingConfig?.id || crypto.randomUUID(),
        category: formData.category,
        name: formData.name,
        value: formData.value,
        isActive: formData.isActive,
        settings: formData.settings,
        thresholds: formData.thresholds,
        monitoring: formData.monitoring,
        alerts: formData.alerts,
        createdAt: editingConfig?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedConfigs = editingConfig
        ? performanceConfigs.map((c) =>
            c.id === editingConfig.id ? newConfig : c,
          )
        : [...performanceConfigs, newConfig];
      await settingsOperations.updatePerformanceConfigs(
        updatedConfigs as unknown as JsonValue[],
      );
    },
    onSuccess: () => {
      toast.success(
        editingConfig
          ? "Configuration mise à jour avec succès"
          : "Configuration créée avec succès",
      );
      setShowCreateDialog(false);
      setEditingConfig(null);
      setFormData({ ...DEFAULT_FORM_DATA });
      void invalidate();
    },
    onError: (error) => {
      console.error("Error saving performance config:", error);
      toast.error("Erreur lors de la sauvegarde");
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: string) => {
      const updatedConfigs = performanceConfigs.filter(
        (c) => c.id !== configId,
      );
      await settingsOperations.updatePerformanceConfigs(
        updatedConfigs as unknown as JsonValue[],
      );
    },
    onSuccess: () => {
      toast.success("Configuration supprimée avec succès");
      setDeleteConfirmOpen(false);
      setConfigToDelete(null);
      void invalidate();
    },
    onError: (error) => {
      console.error("Error deleting performance config:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (config: PerformanceConfig) => {
      const updatedConfigs = performanceConfigs.map((c) =>
        c.id === config.id ? { ...c, isActive: !c.isActive } : c,
      );
      await settingsOperations.updatePerformanceConfigs(
        updatedConfigs as unknown as JsonValue[],
      );
      return config.isActive;
    },
    onSuccess: (wasActive) => {
      toast.success(
        `Configuration ${wasActive ? "désactivée" : "activée"} avec succès`,
      );
      void invalidate();
    },
    onError: (error) => {
      console.error("Error updating config status:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const openEditDialog = (config: PerformanceConfig) => {
    setEditingConfig(config);
    setFormData({
      category: config.category as PerformanceCategory,
      name: config.name,
      value: config.value,
      isActive: config.isActive,
      settings: { ...DEFAULT_FORM_DATA.settings, ...config.settings },
      thresholds: { ...DEFAULT_FORM_DATA.thresholds, ...config.thresholds },
      monitoring: {
        enabled: config.monitoring?.enabled ?? true,
        interval: config.monitoring?.interval ?? 60,
        intervalSeconds: config.monitoring?.intervalSeconds ?? 60,
        retention_days: config.monitoring?.retention_days ?? 30,
        metrics: config.monitoring?.metrics ?? ["response_time"],
      },
      alerts: config.alerts || [],
    });
    setShowCreateDialog(true);
  };

  return {
    performanceConfigs,
    loading,
    saving: saveConfigMutation.isPending,
    showCreateDialog,
    setShowCreateDialog,
    editingConfig,
    setEditingConfig,
    activeSubTab,
    setActiveSubTab,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    configToDelete,
    formData,
    setFormData,
    savePerformanceConfig: () => saveConfigMutation.mutateAsync(),
    deletePerformanceConfig: () =>
      configToDelete && deleteConfigMutation.mutateAsync(configToDelete.id),
    confirmDeletePerformanceConfig: (config: PerformanceConfig) => {
      setConfigToDelete(config);
      setDeleteConfirmOpen(true);
    },
    toggleConfigStatus: (config: PerformanceConfig) =>
      toggleStatusMutation.mutateAsync(config),
    resetForm: () => setFormData({ ...DEFAULT_FORM_DATA }),
    openEditDialog,
  };
}
