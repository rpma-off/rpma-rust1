import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { taskKeys } from "@/lib/query-keys";
import { useTranslation } from "@/shared/hooks";
import { bigintToNumber, handleError, LogDomain } from "@/shared/utils";
import { useAuth } from "@/shared/hooks/useAuth";
// ❌ CROSS-DOMAIN IMPORT
import { InterventionWorkflowService } from "@/domains/interventions";
import type { TaskWithDetails } from "@/domains/tasks/api/types";
import { taskIpc } from "../ipc/task.ipc";
import {
  canStartIntervention,
  isActiveStatus,
} from "../constants/task-transitions";

const QUICK_NAV_SECTIONS = [
  { id: "task-actions", label: "tasks.actions" },
  { id: "task-overview", label: "tasks.overview" },
  { id: "task-attachments", label: "tasks.attachments" },
  { id: "task-timeline", label: "tasks.history" },
  { id: "task-admin", label: "tasks.administration" },
] as const;

export type QuickNavSection = (typeof QUICK_NAV_SECTIONS)[number];

export function useTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const taskId = params.id as string;

  // ── Server state via TanStack Query (ADR-014) ──────────────────────────

  const {
    data: task = null,
    isLoading: isTaskLoading,
    error: taskQueryError,
  } = useQuery<TaskWithDetails | null>({
    queryKey: taskKeys.byId(taskId),
    queryFn: async () => {
      const result = await taskIpc.get(taskId);
      if (!result) return null;
      return result as TaskWithDetails;
    },
    enabled: !!taskId,
    staleTime: 5 * 60_000,
  });

  // Derive a user-facing error string from the query error
  const error: string | null = taskQueryError
    ? taskQueryError instanceof Error
      ? taskQueryError.message
      : t("errors.connectionError")
    : null;

  // Show toast once when a query error surfaces
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Assignment check — fires in parallel with the task query (only needs taskId)
  const { data: assignmentData } = useQuery({
    queryKey: taskKeys.assignment(taskId, user?.user_id ?? ""),
    queryFn: () => taskIpc.checkTaskAssignment(taskId, user!.user_id),
    enabled: !!taskId && !!user?.token && !!user?.user_id,
    retry: false,
    staleTime: 2 * 60_000,
  });

  // Availability check — fires in parallel with the task query (only needs taskId)
  const { data: availabilityData } = useQuery({
    queryKey: taskKeys.availability(taskId),
    queryFn: () => taskIpc.checkTaskAvailability(taskId),
    enabled: !!taskId && !!user?.token,
    retry: false,
    staleTime: 2 * 60_000,
  });

  const isAssignedToCurrentUser = assignmentData?.status === "assigned";
  const isTaskAvailable = availabilityData
    ? availabilityData.status === "available"
    : true;

  // Unified loading flag — mirrors the original `loading` boolean
  const loading = isTaskLoading;

  // ── UI-only state (ADR-014: useState is fine for these) ────────────────

  const [isStartingIntervention, setIsStartingIntervention] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(
    QUICK_NAV_SECTIONS[0].id,
  );

  // ── Derived state ──────────────────────────────────────────────────────

  const isInProgress = task?.status === "in_progress";
  const isCompleted = task?.status === "completed";
  // Single source of truth: delegates to ALLOWED_TRANSITIONS in task-transitions.ts
  // which mirrors task_state_machine.rs::allowed_transitions() (DEBT-21, ADR-001).
  const canStartTask = task ? canStartIntervention(task.status) : false;

  // Intersection observer for quick-nav highlighting
  useEffect(() => {
    if (!task || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const firstVisible = visible[0];
          if (firstVisible) setActiveSection(firstVisible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.4, 0.7],
      },
    );

    QUICK_NAV_SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [task, loading]);

  const formatDate = (timestamp: bigint | string | null | undefined) => {
    try {
      if (!timestamp) return t("common.noData");
      const date =
        typeof timestamp === "bigint"
          ? new Date(bigintToNumber(timestamp) || 0)
          : new Date(timestamp);
      return date.toLocaleDateString("fr-FR");
    } catch {
      return t("errors.invalidDate");
    }
  };

  const progressValue = useMemo(() => {
    if (!task) return 0;

    let progress = 0;
    let total = 0;

    if (task.photos_before && task.photos_before.length > 0) {
      progress += 1;
      total += 1;
    }
    if (task.photos_after && task.photos_after.length > 0) {
      progress += 1;
      total += 1;
    }
    if (task.checklist_items && task.checklist_items.length > 0) {
      const completedItems = task.checklist_items.filter(
        (item) => item.is_completed,
      ).length;
      progress += completedItems;
      total += task.checklist_items.length;
    }

    return total > 0 ? Math.round((progress / total) * 100) : 0;
  }, [task]);

  const workflowSteps = useMemo(() => {
    const hasBeforePhotos =
      task?.photos_before && task.photos_before.length > 0;
    const hasAfterPhotos = task?.photos_after && task.photos_after.length > 0;
    const hasChecklist =
      task?.checklist_items && task.checklist_items.length > 0;
    const checklistCompleted =
      task?.checklist_items?.filter((item) => item.is_completed).length ===
      task?.checklist_items?.length;

    return [
      {
        id: "photos_before",
        label: "Photos Avant",
        status: (hasBeforePhotos ? "completed" : "pending") as
          | "completed"
          | "in_progress"
          | "pending",
        count: task?.photos_before?.length,
      },
      {
        id: "workflow",
        label: "Workflow",
        status: (isInProgress
          ? "in_progress"
          : isCompleted
            ? "completed"
            : "pending") as "completed" | "in_progress" | "pending",
      },
      {
        id: "photos_after",
        label: "Photos Après",
        status: (hasAfterPhotos ? "completed" : "pending") as
          | "completed"
          | "in_progress"
          | "pending",
        count: task?.photos_after?.length,
      },
      {
        id: "checklist",
        label: "Validation",
        status: (checklistCompleted
          ? "completed"
          : hasChecklist
            ? "in_progress"
            : "pending") as "completed" | "in_progress" | "pending",
        count: task?.checklist_items?.filter((item) => item.is_completed)
          .length,
      },
    ];
  }, [task, isInProgress, isCompleted]);

  const handlePrimaryAction = async () => {
    if (isCompleted) {
      router.push(`/tasks/${taskId}/completed`);
    } else if (isInProgress) {
      router.push(`/tasks/${taskId}/workflow/ppf`);
    } else if (canStartTask) {
      if (!task) return;
      if (!user?.token) {
        toast.error(t("errors.sessionExpired"));
        return;
      }

      try {
        setIsStartingIntervention(true);

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
          weather_condition: "sunny",
          lighting_condition: "natural",
          work_location: "outdoor",
          temperature: null,
          humidity: null,
          technician_id: task.technician_id || user.user_id,
          assistant_ids: null,
          scheduled_start: Date.now(),
          estimated_duration: task.estimated_duration || 120,
          gps_coordinates: null,
          address: task.customer_address || null,
          notes: task.notes || null,
          customer_requirements: null,
          special_instructions: null,
        };

        const response = await InterventionWorkflowService.startIntervention(
          task.id,
          interventionData,
        );
        if (!response.success) {
          throw new Error(
            response.error?.message || "Impossible de démarrer l'intervention",
          );
        }

        toast.success("Intervention démarrée avec succès");
        router.push(`/tasks/${taskId}/workflow/ppf`);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur au démarrage de l'intervention";
        toast.error(message);
        handleError(err, "Failed to start intervention from task detail page", {
          domain: LogDomain.TASK,
          component: "TaskDetailPage",
          showToast: false,
        });
      } finally {
        setIsStartingIntervention(false);
      }
    }
  };

  const handleSecondaryAction = (actionId: string) => {
    switch (actionId) {
      case "workflow":
        if (isInProgress || isCompleted) {
          router.push(`/tasks/${taskId}/workflow/ppf`);
        }
        break;
      case "photos":
        router.push(`/tasks/${taskId}/photos`);
        break;
      case "checklist":
        router.push(`/tasks/${taskId}/checklist`);
        break;
      case "call":
        if (task?.customer_phone) {
          window.location.href = `tel:${task.customer_phone}`;
        }
        break;
      case "message":
      case "edit":
      case "delay":
      case "report":
        toast.info(`Action "${actionId}" en cours de développement`);
        break;
    }
  };

  // Hide the mobile action bar only when the task has reached a terminal state
  // (completed, cancelled, archived). Use isActiveStatus rather than a raw string
  // comparison so the check stays in sync with the state machine (DEBT-21).
  const showMobileActionBar = !!task && isActiveStatus(task.status);

  return {
    taskId,
    task,
    loading,
    error,
    isInProgress,
    isCompleted,
    canStartTask,
    isAssignedToCurrentUser,
    isTaskAvailable,
    isStartingIntervention,
    activeSection,
    progressValue,
    workflowSteps,
    showMobileActionBar,
    quickNavSections: QUICK_NAV_SECTIONS,
    formatDate,
    handlePrimaryAction,
    handleSecondaryAction,
    router,
    t,
  };
}
