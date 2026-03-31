"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { makeMutationErrorHandler } from "./mutation-error";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Settings,
  Target,
  Zap,
} from "lucide-react";
import { adminKeys } from "@/lib/query-keys";
import { ipcClient } from "@/lib/ipc";
import type {
  BackendRuleAction,
  BackendRuleDefinition,
  BackendRuleMode,
  BackendRuleTrigger,
  BusinessRule,
  BusinessRuleCategory,
  RuleAction,
  RuleCondition,
} from "@/shared/types";
import type { BusinessRuleFormData } from "../components/BusinessRuleFormDialog";

function categoryToBackendShape(category: string): {
  mode: BackendRuleMode;
  trigger: BackendRuleTrigger;
  template_key: string;
} {
  switch (category) {
    case "validation":
      return {
        mode: "blocking",
        trigger: "task_status_changed",
        template_key: "task-status-policy",
      };
    case "escalation":
      return {
        mode: "blocking",
        trigger: "intervention_finalized",
        template_key: "intervention-escalation",
      };
    case "notification":
      return {
        mode: "reactive",
        trigger: "task_created",
        template_key: "task-notification",
      };
    case "automation":
      return {
        mode: "reactive",
        trigger: "task_created",
        template_key: "task-automation",
      };
    case "task_assignment":
    default:
      return {
        mode: "reactive",
        trigger: "task_created",
        template_key: "task-assignment",
      };
  }
}

function backendToCategory(rule: BackendRuleDefinition): BusinessRuleCategory {
  if (rule.mode === "blocking") {
    return rule.trigger === "intervention_finalized"
      ? "escalation"
      : "validation";
  }

  if (rule.template_key.includes("notification")) return "notification";
  if (rule.template_key.includes("assignment")) return "task_assignment";
  return "automation";
}

function conditionsToBackend(conditions: RuleCondition[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const condition of conditions) {
    if (!condition.field) continue;

    const values = Array.isArray(condition.value)
      ? condition.value
      : [condition.value];

    if (condition.field === "status") {
      result.status_in = values.map(String);
    } else if (condition.field === "priority") {
      result.priority_in = values.map(String);
    } else if (condition.field === "task_id") {
      result.task_id_in = values.map(String);
    }
  }

  return result;
}

function backendToConditions(conditions: unknown): RuleCondition[] {
  const source =
    conditions && typeof conditions === "object" && !Array.isArray(conditions)
      ? (conditions as Record<string, unknown>)
      : {};

  const mapped: RuleCondition[] = [];

  const pushArray = (field: string, key: string) => {
    const value = source[key];
    if (!Array.isArray(value)) return;
    mapped.push({
      field,
      operator: "in",
      value: value.map(String),
    });
  };

  pushArray("task_id", "task_id_in");
  pushArray("status", "status_in");
  pushArray("priority", "priority_in");

  return mapped;
}

function actionsToBackend(
  actions: RuleAction[],
  category: string,
): BackendRuleAction[] {
  if (actions.some((action) => action.type === "block_completion")) {
    const blockAction = actions.find(
      (action) => action.type === "block_completion",
    );
    return [
      {
        type: "block",
        message:
          typeof blockAction?.value === "string" && blockAction.value
            ? blockAction.value
            : "Action blocked by rule policy",
      },
    ];
  }

  return [
    {
      type: "queue_integration",
      event_name: `rule.${category}`,
      integration_ids: null,
    },
  ];
}

function backendToActions(actions: BackendRuleAction[]): RuleAction[] {
  return actions.map((action) => {
    if (action.type === "block") {
      return {
        type: "block_completion",
        target: "workflow",
        value: action.message,
      };
    }

    return {
      type: "send_notification",
      target: action.event_name,
      value: action.event_name,
    };
  });
}

function toUiRule(rule: BackendRuleDefinition): BusinessRule {
  const category = backendToCategory(rule);
  return {
    id: rule.id,
    name: rule.name,
    category,
    description: rule.description ?? undefined,
    conditions: backendToConditions(rule.conditions),
    actions: backendToActions(rule.actions),
    priority: rule.mode === "blocking" ? 10 : 0,
    is_active: rule.status === "active",
    isActive: rule.status === "active",
    created_at: new Date(rule.created_at).toISOString(),
    updated_at: new Date(rule.updated_at).toISOString(),
    createdAt: new Date(rule.created_at).toISOString(),
  };
}

function buildTestPayload(rule: BusinessRule, backendRule?: BackendRuleDefinition) {
  const conditions = rule.conditions;
  const payload: Record<string, unknown> = {};

  for (const condition of conditions) {
    const firstValue = Array.isArray(condition.value)
      ? condition.value[0]
      : condition.value;

    if (condition.field === "status") {
      payload.status = firstValue ?? "pending";
      payload.new_status = firstValue ?? "pending";
    } else if (condition.field === "priority") {
      payload.priority = firstValue ?? "normal";
    }
  }

  const trigger = backendRule?.trigger ?? categoryToBackendShape(rule.category).trigger;
  return {
    trigger,
    entity_id: rule.conditions.find((condition) => condition.field === "task_id")
      ? "task-preview"
      : null,
    payload,
  } as const;
}

export function useBusinessRules() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);
  const [testingRule, setTestingRule] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<BusinessRule | null>(null);

  const queryClient = useQueryClient();

  const {
    data: backendRules = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: adminKeys.businessRules(),
    queryFn: () => ipcClient.rules.list(),
    staleTime: 60_000,
  });

  const businessRules = backendRules.map(toUiRule);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.businessRules() });

  const saveRuleMutation = useMutation({
    mutationFn: async (data: BusinessRuleFormData) => {
      const backendShape = categoryToBackendShape(data.category);
      const request = {
        name: data.name,
        description: data.description || null,
        template_key: backendShape.template_key,
        trigger: backendShape.trigger,
        mode: backendShape.mode,
        conditions: conditionsToBackend(data.conditions),
        actions: actionsToBackend(data.actions, data.category),
      } as const;

      if (editingRule) {
        return ipcClient.rules.update(editingRule.id, {
          ...request,
          status: data.isActive ? "active" : "disabled",
        });
      }

      const created = await ipcClient.rules.create(request);
      if (data.isActive) {
        return ipcClient.rules.activate(created.id);
      }
      return created;
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
    onError: makeMutationErrorHandler("la sauvegarde"),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => ipcClient.rules.delete(ruleId),
    onSuccess: () => {
      toast.success("Règle supprimée avec succès");
      setRuleToDelete(null);
      setDeleteConfirmOpen(false);
      void invalidate();
    },
    onError: makeMutationErrorHandler("la suppression"),
  });

  const toggleRuleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? ipcClient.rules.disable(id) : ipcClient.rules.activate(id),
    onSuccess: (_, variables) => {
      toast.success(
        `Règle ${variables.isActive ? "désactivée" : "activée"} avec succès`,
      );
      void invalidate();
    },
    onError: makeMutationErrorHandler("la mise à jour"),
  });

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
      const backendRule = backendRules.find((candidate) => candidate.id === id);
      const uiRule = businessRules.find((candidate) => candidate.id === id);
      if (!backendRule || !uiRule) {
        toast.error("Règle introuvable");
        return;
      }

      const result = await ipcClient.rules.test(buildTestPayload(uiRule, backendRule));
      toast.success(
        result.allowed
          ? "Test réussi: aucune règle bloquante détectée"
          : result.message ?? "Test réussi: blocage détecté",
      );
    } catch (error) {
      console.error("Error testing business rule:", error);
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
