"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  Settings,
  Zap,
  Target,
  Bell,
} from "lucide-react";
import { useLogger } from "@/shared/hooks/useLogger";
import { LogDomain } from "@/shared/utils";
import { settingsOperations } from "@/shared/utils";
import { adminKeys } from "@/lib/query-keys";
import type { JsonValue } from "@/shared/types";
import type { BusinessRule } from "@/shared/types";
import { useAuth } from "@/shared/hooks/useAuth";
import type { BusinessRuleFormData } from "../components/BusinessRuleFormDialog";

export function useBusinessRules() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);
  const [testingRule, setTestingRule] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<BusinessRule | null>(null);

  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { logInfo, logError } = useLogger({
    context: LogDomain.SYSTEM,
    component: "BusinessRulesTab",
  });

  // ── Query ──────────────────────────────────────────────────────────────────
  const {
    data: businessRules = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: adminKeys.appSettings(),
    queryFn: () => settingsOperations.getAppSettings(),
    enabled: !!session?.token,
    staleTime: 60_000,
    select: (data) => {
      const appSettings = data as Record<string, JsonValue>;
      const rules = (appSettings?.business_rules ||
        []) as unknown as BusinessRule[];
      const result = Array.isArray(rules) ? rules : [];
      logInfo("Business rules loaded", { count: result.length });
      return result;
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.appSettings() });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveRuleMutation = useMutation({
    mutationFn: async (data: BusinessRuleFormData) => {
      const newRule: BusinessRule = {
        id: editingRule?.id || crypto.randomUUID(),
        name: data.name,
        description: data.description,
        category: data.category,
        priority: data.priority,
        is_active: data.isActive,
        isActive: data.isActive,
        conditions: data.conditions,
        actions: data.actions,
        created_at: editingRule?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: editingRule?.createdAt || new Date().toISOString(),
      };
      const updatedRules = editingRule
        ? businessRules.map((rule) =>
            rule.id === editingRule.id ? newRule : rule,
          )
        : [...businessRules, newRule];
      await settingsOperations.updateBusinessRules(
        updatedRules as unknown as JsonValue[],
      );
    },
    onSuccess: () => {
      toast.success(
        editingRule
          ? "Règle mise à jour avec succès"
          : "Règle créée avec succès",
      );
      setShowCreateDialog(false);
      setEditingRule(null);
      void invalidate();
    },
    onError: (error) => {
      logError("Error saving business rule", {
        error: error instanceof Error ? error.message : error,
      });
      toast.error("Erreur lors de la sauvegarde");
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const updatedRules = businessRules.filter((rule) => rule.id !== ruleId);
      await settingsOperations.updateBusinessRules(
        updatedRules as unknown as JsonValue[],
      );
    },
    onSuccess: () => {
      toast.success("Règle supprimée avec succès");
      setRuleToDelete(null);
      setDeleteConfirmOpen(false);
      void invalidate();
    },
    onError: (error) => {
      logError("Error deleting business rule", {
        error: error instanceof Error ? error.message : error,
      });
      toast.error("Erreur lors de la suppression");
    },
  });

  const toggleRuleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const updatedRules = businessRules.map((rule) =>
        rule.id === id
          ? { ...rule, is_active: !isActive, isActive: !isActive }
          : rule,
      );
      await settingsOperations.updateBusinessRules(
        updatedRules as unknown as JsonValue[],
      );
      return !isActive;
    },
    onSuccess: (newActive) => {
      toast.success(
        `Règle ${newActive ? "activée" : "désactivée"} avec succès`,
      );
      void invalidate();
    },
    onError: (error) => {
      logError("Error toggling business rule", {
        error: error instanceof Error ? error.message : error,
      });
      toast.error("Erreur lors de la mise à jour");
    },
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  const openEditDialog = (rule: BusinessRule) => {
    setEditingRule(rule);
    setShowCreateDialog(true);
  };

  const saveRule = (data: BusinessRuleFormData) =>
    saveRuleMutation.mutateAsync(data);

  const confirmDeleteRule = (rule: BusinessRule) => {
    setRuleToDelete(rule);
    setDeleteConfirmOpen(true);
  };

  const deleteRule = async () => {
    if (ruleToDelete) await deleteRuleMutation.mutateAsync(ruleToDelete.id);
  };

  const toggleRuleStatus = (id: string, isActive: boolean) =>
    toggleRuleStatusMutation.mutateAsync({ id, isActive });

  const testRule = async (id: string) => {
    setTestingRule(id);
    try {
      const rule = businessRules.find((candidate) => candidate.id === id);
      if (!rule) {
        toast.error("Règle introuvable");
        return;
      }
      if (rule.conditions.length === 0) {
        toast.warning("Validation: la règle n'a aucune condition définie");
      } else if (rule.actions.length === 0) {
        toast.warning("Validation: la règle n'a aucune action définie");
      } else {
        toast.success("Validation réussie: structure de règle valide");
      }
    } catch (error) {
      logError("Error testing business rule", {
        error: error instanceof Error ? error.message : error,
      });
      toast.error("Erreur lors du test");
    } finally {
      setTestingRule(null);
    }
  };

  const filteredRules = businessRules.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.description?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false);
    const matchesCategory =
      filterCategory === "all" || rule.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const icons = {
      task_assignment: Target,
      notification: Bell,
      validation: CheckCircle,
      automation: Zap,
      escalation: AlertTriangle,
    };
    return icons[category as keyof typeof icons] || Settings;
  };

  return {
    businessRules,
    loading,
    saving: saveRuleMutation.isPending,
    showCreateDialog,
    setShowCreateDialog,
    editingRule,
    setEditingRule,
    testingRule,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    ruleToDelete,
    loadBusinessRules: () => {
      void refetch();
    },
    refetch,
    openEditDialog,
    saveRule,
    confirmDeleteRule,
    deleteRule,
    toggleRuleStatus,
    testRule,
    filteredRules,
    getCategoryIcon,
  };
}
