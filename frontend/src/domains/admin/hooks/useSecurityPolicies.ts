import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SecurityPolicy } from "@/shared/types";
import { settingsOperations } from "@/shared/utils";
import { adminKeys } from "@/lib/query-keys";
import type { JsonValue } from "@/shared/types";

export function useSecurityPolicies() {
  const queryClient = useQueryClient();

  const {
    data: policies = [],
    isLoading: loading,
    refetch: reload,
  } = useQuery({
    queryKey: adminKeys.appSettings(),
    queryFn: () => settingsOperations.getAppSettings(),
    staleTime: 60_000,
    select: (data) => {
      const appSettings = data as Record<string, JsonValue>;
      const raw = (appSettings?.security_policies ||
        []) as unknown as SecurityPolicy[];
      return Array.isArray(raw) ? raw : [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.appSettings() });

  const saveMutation = useMutation({
    mutationFn: async ({
      policy,
      isEditing,
    }: {
      policy: SecurityPolicy;
      isEditing: boolean;
    }) => {
      const updatedPolicies = isEditing
        ? policies.map((p) => (p.id === policy.id ? policy : p))
        : [...policies, policy];
      await settingsOperations.updateGeneralSettings({
        security_policies: updatedPolicies as unknown as JsonValue,
      } as Record<string, JsonValue>);
      return isEditing;
    },
    onSuccess: (isEditing) => {
      toast.success(
        isEditing
          ? "Politique mise à jour avec succès"
          : "Politique créée avec succès",
      );
      void invalidate();
    },
    onError: (error) => {
      console.error("Error saving security policy:", error);
      toast.error("Erreur lors de la sauvegarde");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const updatedPolicies = policies.filter((p) => p.id !== policyId);
      await settingsOperations.updateGeneralSettings({
        security_policies: updatedPolicies as unknown as JsonValue,
      } as Record<string, JsonValue>);
    },
    onSuccess: () => {
      toast.success("Politique supprimée avec succès");
      void invalidate();
    },
    onError: (error) => {
      console.error("Error deleting security policy:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (policy: SecurityPolicy) => {
      const updatedPolicies = policies.map((p) =>
        p.id === policy.id
          ? { ...p, is_active: !p.is_active, isActive: !p.is_active }
          : p,
      );
      await settingsOperations.updateGeneralSettings({
        security_policies: updatedPolicies as unknown as JsonValue,
      } as Record<string, JsonValue>);
      return policy.is_active;
    },
    onSuccess: (wasActive) => {
      toast.success(
        `Politique ${wasActive ? "désactivée" : "activée"} avec succès`,
      );
      void invalidate();
    },
    onError: (error) => {
      console.error("Error updating policy status:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const save = useCallback(
    (policy: SecurityPolicy, isEditing: boolean) =>
      saveMutation.mutateAsync({ policy, isEditing }),
    [saveMutation],
  );

  const remove = useCallback(
    (policyId: string) => removeMutation.mutateAsync(policyId),
    [removeMutation],
  );

  const toggle = useCallback(
    (policy: SecurityPolicy) => toggleMutation.mutateAsync(policy),
    [toggleMutation],
  );

  return {
    policies,
    loading,
    saving:
      saveMutation.isPending ||
      removeMutation.isPending ||
      toggleMutation.isPending,
    reload,
    save,
    remove,
    toggle,
  };
}
