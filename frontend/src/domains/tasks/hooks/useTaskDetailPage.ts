import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/shared/hooks";
import { bigintToNumber, handleError, LogDomain } from "@/shared/utils";
import { useAuth } from "@/shared/hooks/useAuth";
import { taskGateway } from "@/domains/tasks/api/taskGateway";
// ❌ CROSS-DOMAIN IMPORT
import { InterventionWorkflowService } from "@/domains/interventions";
import type { TaskWithDetails } from "@/domains/tasks/api/types";
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

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignedToCurrentUser, setIsAssignedToCurrentUser] = useState(false);
  const [isTaskAvailable, setIsTaskAvailable] = useState(true);
  const [isStartingIntervention, setIsStartingIntervention] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(
    QUICK_NAV_SECTIONS[0].id,
  );

  const isInProgress = task?.status === "in_progress";
  const isCompleted = task?.status === "completed";
  // Single source of truth: delegates to ALLOWED_TRANSITIONS in task-transitions.ts
  // which mirrors task_state_machine.rs::allowed_transitions() (DEBT-21, ADR-001).
  const canStartTask = task ? canStartIntervention(task.status) : false;

  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await taskGateway.getTaskById(taskId);

        if (result.error) {
          if (result.status === 404) {
            setError(t("tasks.notFound"));
            toast.error(t("tasks.notFound"));
          } else if (result.status === 403) {
            setError(t("tasks.unauthorized"));
            toast.error(t("tasks.unauthorized"));
          } else {
            const errorMessage = result.error || t("errors.loadFailed");
            setError(errorMessage);
            toast.error(errorMessage);
          }
          return;
        }

        setTask(result.data || null);

        if (result.data && user?.token) {
          try {
            const assignmentCheck = await taskGateway.checkTaskAssignment(
              result.data.id,
              user.user_id,
            );
            setIsAssignedToCurrentUser(assignmentCheck.status === "assigned");

            const availabilityCheck = await taskGateway.checkTaskAvailability(
              result.data.id,
            );
            setIsTaskAvailable(availabilityCheck.status === "available");
          } catch (validationErr) {
            const validationError = validationErr as Error;
            console.warn("Task validation failed:", {
              taskId: result.data.id,
              userId: user.user_id,
              error: validationError.message,
              code: (validationError as { code?: string }).code,
              details: (validationError as { details?: unknown }).details,
            });

            if (
              validationError.message?.includes("authentication") ||
              validationError.message?.includes("token")
            ) {
              handleError(
                new Error(t("errors.sessionExpired")),
                "Authentication failed during task validation",
                {
                  domain: LogDomain.API,
                  userId: user?.user_id,
                  component: "TaskValidation",
                  showToast: true,
                },
              );
            } else if (
              validationError.message?.includes("authorization") ||
              validationError.message?.includes("permission")
            ) {
              handleError(
                new Error(t("errors.permissionDenied")),
                "Authorization failed during task validation",
                {
                  domain: LogDomain.API,
                  userId: user?.user_id,
                  component: "TaskValidation",
                  showToast: true,
                },
              );
            } else if (validationError.message?.includes("rate limit")) {
              handleError(
                new Error(t("errors.rateLimitExceeded")),
                "Rate limit exceeded during task validation",
                {
                  domain: LogDomain.API,
                  userId: user?.user_id,
                  component: "TaskValidation",
                  showToast: true,
                },
              );
            } else {
              console.warn(
                "Task validation encountered an issue but continuing with defaults",
              );
            }
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("errors.connectionError");
        setError(errorMessage);
        handleError(err, "Failed to fetch task details", {
          domain: LogDomain.TASK,
          component: "TaskDetailPage",
          showToast: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, user?.token, user?.user_id, t]);

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
          scheduled_start: new Date().toISOString(),
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

        setTask((prev) => (prev ? { ...prev, status: "in_progress" } : prev));
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
