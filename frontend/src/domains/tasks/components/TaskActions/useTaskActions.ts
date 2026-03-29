import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TaskPriority, TaskStatus } from "@/lib/backend";
import { phone } from "@/lib/utils/phone";
import { interventionKeys, taskKeys } from "@/lib/query-keys";
import { TaskWithDetails } from "@/types/task.types";
import { useAuth } from "@/shared/hooks/useAuth";
// ❌ CROSS-DOMAIN IMPORT
import { InterventionWorkflowService } from "@/domains/interventions";
import { taskService } from "../../services";
import {
  createNotesUpdate,
  createPriorityUpdate,
  createStatusUpdate,
} from "./task-updates";

export function useTaskActions(task: TaskWithDetails) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  // ── Optimistic update helpers ─────────────────────────────────────────────
  //
  // All field-level task mutations use the same optimistic update pattern:
  // 1. Cancel in-flight queries for this task
  // 2. Apply the optimistic value immediately to the cache
  // 3. Roll back on error
  // 4. Re-fetch on settled
  //
  // `makeOptimisticMutationHandlers` captures that boilerplate once.
  // Individual mutations only specify *what* to patch and *what to say* on error.
  function makeOptimisticMutationHandlers<V>(opts: {
    getOptimisticPatch: (value: V) => Record<string, unknown>;
    errorToast: string;
    errorLabel: string;
  }) {
    return {
      onMutate: async (value: V) => {
        await queryClient.cancelQueries({ queryKey: taskKeys.byId(task.id) });
        const previousTask = queryClient.getQueryData(taskKeys.byId(task.id));
        queryClient.setQueryData(taskKeys.byId(task.id), (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          return {
            ...(old as Record<string, unknown>),
            ...opts.getOptimisticPatch(value),
          };
        });
        return { previousTask };
      },
      onError: (
        error: Error,
        _value: V,
        context?: { previousTask: unknown },
      ) => {
        if (context?.previousTask !== undefined) {
          queryClient.setQueryData(
            taskKeys.byId(task.id),
            context.previousTask,
          );
        }
        toast.error(opts.errorToast);
        console.error(opts.errorLabel, error);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.id) });
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      },
    };
  }

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      if (!user?.token) throw new Error("Utilisateur non authentifie");
      return await taskService.updateTask(
        task.id,
        createStatusUpdate(newStatus),
      );
    },
    onSuccess: () => {
      toast.success("Statut mis a jour avec succes");
    },
    ...makeOptimisticMutationHandlers<TaskStatus>({
      getOptimisticPatch: (s) => ({ status: s }),
      errorToast: "Erreur lors de la mise a jour du statut",
      errorLabel: "Status update error:",
    }),
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: TaskPriority) => {
      if (!user?.token) throw new Error("Utilisateur non authentifie");
      return await taskService.updateTask(
        task.id,
        createPriorityUpdate(newPriority),
      );
    },
    onSuccess: () => {
      toast.success("Priorite mise a jour avec succes");
    },
    ...makeOptimisticMutationHandlers<TaskPriority>({
      getOptimisticPatch: (p) => ({ priority: p }),
      errorToast: "Erreur lors de la mise a jour de la priorite",
      errorLabel: "Priority update error:",
    }),
  });

  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error("Utilisateur non authentifie");
      return await taskService.assignTask(task.id, user.id);
    },
    onSuccess: () => {
      toast.success("Tache assignee avec succes");
    },
    ...makeOptimisticMutationHandlers<void>({
      getOptimisticPatch: () => ({ technician_id: user?.id }),
      errorToast: "Erreur lors de l'assignation",
      errorLabel: "Assignment error:",
    }),
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!user?.token) throw new Error("Utilisateur non authentifie");
      return await taskService.updateTask(task.id, createNotesUpdate(notes));
    },
    onSuccess: () => {
      toast.success("Notes mises a jour avec succes");
    },
    ...makeOptimisticMutationHandlers<string>({
      getOptimisticPatch: (n) => ({ notes: n }),
      errorToast: "Erreur lors de la mise a jour des notes",
      errorLabel: "Notes update error:",
    }),
  });

  const startInterventionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error("Utilisateur non authentifie");

      const interventionData = {
        task_id: task.id,
        intervention_number: null,
        intervention_type: "ppf",
        priority: task.priority || "medium",
        ppf_zones: task.ppf_zones || [],
        custom_ppf_zones: task.custom_ppf_zones || null,
        film_type: "standard",
        film_brand: null,
        film_model: null,
        temperature: null,
        humidity: null,
        lighting_condition: null,
        work_location: null,
        ppf_zones_config: task.ppf_zones || [],
        gps_start_location: null,
        gps_end_location: null,
        weather_condition: null,
        notes: null,
      };

      const result = await InterventionWorkflowService.startIntervention(
        task.id,
        interventionData,
      );

      if (!result.success || !result.data) {
        throw new Error(
          result.error?.message ||
            "Invalid response format for intervention start",
        );
      }

      return result.data as {
        success: boolean;
        intervention: unknown;
        steps: unknown[];
      };
    },
    onSuccess: (result) => {
      if (result.success && result.intervention) {
        queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.id) });
        queryClient.invalidateQueries({ queryKey: interventionKeys.byTask(task.id) });
        queryClient.invalidateQueries({ queryKey: interventionKeys.activeForTask(task.id) });
        toast.success("Intervention demarree avec succes");
        router.push(`/tasks/${task.id}/workflow/ppf/steps/preparation`);
      }
    },
    onError: (error) => {
      toast.error("Erreur lors du demarrage de l'intervention");
      console.error("Start intervention error:", error);
    },
  });

  const initiateCallMutation = useMutation({
    mutationFn: async () => {
      const phoneNumber = task.customer_phone;
      if (!phoneNumber) {
        toast.error("Aucun numero de telephone disponible pour ce client");
        return;
      }

      await phone.initiateCustomerCall(phoneNumber);
      toast.success(`Appel lance vers ${phoneNumber}`);
    },
    onError: (error) => {
      console.error("Failed to initiate call:", error);
      toast.error("Erreur lors de l'appel client");
    },
  });

  return {
    updateStatus: updateStatusMutation.mutate,
    updatePriority: updatePriorityMutation.mutate,
    assignToMe: assignToMeMutation.mutate,
    updateNotes: updateNotesMutation.mutate,
    startIntervention: startInterventionMutation.mutate,
    initiateCall: initiateCallMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdatingPriority: updatePriorityMutation.isPending,
    isAssigning: assignToMeMutation.isPending,
    isUpdatingNotes: updateNotesMutation.isPending,
    isStartingIntervention: startInterventionMutation.isPending,
    isInitiatingCall: initiateCallMutation.isPending,
  };
}
