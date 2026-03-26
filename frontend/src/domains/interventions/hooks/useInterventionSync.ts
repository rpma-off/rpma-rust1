"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthSecureStorage } from "@/lib/secureStorage";
import { interventionKeys } from "@/lib/query-keys";
import { logger } from "@/lib/logging";
import { LogDomain } from "@/lib/logging/types";
import type {
  PPFInterventionData,
  PPFInterventionStep,
} from "@/types/ppf-intervention";
import { interventionWorkflowService } from "../services";

interface UseInterventionSyncProps {
  taskId?: string;
  onInterventionLoaded?: (intervention: PPFInterventionData | null) => void;
  onStepsLoaded?: (steps: PPFInterventionStep[]) => void;
  onCurrentStepUpdate?: (step: PPFInterventionStep | null) => void;
}

export function useInterventionSync({
  taskId,
  onInterventionLoaded,
  onStepsLoaded,
  onCurrentStepUpdate,
}: UseInterventionSyncProps = {}) {
  // Load active intervention for current task
  const loadActiveInterventionQuery = useQuery<
    PPFInterventionData | null,
    Error,
    PPFInterventionData | null,
    (string | undefined)[]
  >({
    queryKey: interventionKeys.activeForTask(taskId || ""),
    queryFn: async ({ queryKey }) => {
      const currentTaskId = queryKey[1];
      if (!currentTaskId) {
        return null;
      }

      try {
        const session = await AuthSecureStorage.getSession();
        const sessionToken = session.token;
        if (!sessionToken) {
          logger.warn(
            LogDomain.TASK,
            "No session token available for getActiveByTask",
            { task_id: currentTaskId },
          );
          return null;
        }

        const result =
          await interventionWorkflowService.getActiveByTask(currentTaskId);
        const interventionData = result.data;
        if (interventionData) {
          const backendIntervention = interventionData as Record<
            string,
            unknown
          >;
          const mappedIntervention: PPFInterventionData = {
            id: backendIntervention.id as string,
            taskId: backendIntervention.task_number as string,
            task_id: backendIntervention.task_number as string,
            intervention_number: backendIntervention.task_number as string,
            steps: [],
            status: backendIntervention.status as PPFInterventionData["status"],
            progress: backendIntervention.completion_percentage as number,
            progress_percentage:
              backendIntervention.completion_percentage as number,
            currentStep: backendIntervention.current_step as number,
            completion_percentage:
              backendIntervention.completion_percentage as number,
            createdAt: backendIntervention.created_at as string,
            created_at: backendIntervention.created_at as string | undefined,
            updatedAt: backendIntervention.updated_at as string,
            updated_at: backendIntervention.updated_at as string | undefined,
            technician_id: backendIntervention.technician_id as
              | string
              | undefined,
            created_by: backendIntervention.created_by as string | undefined,
            client_id: backendIntervention.client_id as string | undefined,
            vehicle_make: backendIntervention.vehicle_make as
              | string
              | undefined,
            vehicle_model: backendIntervention.vehicle_model as
              | string
              | undefined,
            vehicle_year: backendIntervention.vehicle_year as
              | number
              | undefined,
            vehicle_vin: backendIntervention.vehicle_vin as string | undefined,
            vehicle_info: backendIntervention.vehicle_make
              ? {
                  make: backendIntervention.vehicle_make as string,
                  model: backendIntervention.vehicle_model as string,
                  year: backendIntervention.vehicle_year as number,
                  vin: backendIntervention.vehicle_vin as string,
                }
              : undefined,
            weather_condition:
              backendIntervention.weather_condition as PPFInterventionData["weather_condition"],
            temperature_celsius: backendIntervention.temperature_celsius as
              | number
              | undefined,
            started_at: backendIntervention.started_at as string | undefined,
            actual_start: backendIntervention.started_at as string | undefined,
            scheduled_start: backendIntervention.scheduled_at as
              | string
              | undefined,
            completed_at: backendIntervention.completed_at as
              | string
              | undefined,
            intervention_completed_at: backendIntervention.completed_at as
              | string
              | undefined,
            estimated_duration: backendIntervention.estimated_duration as
              | number
              | undefined,
            actual_duration: backendIntervention.actual_duration as
              | number
              | undefined,
            gps_coordinates: backendIntervention.start_location_lat
              ? {
                  latitude: backendIntervention.start_location_lat as number,
                  longitude: backendIntervention.start_location_lon as number,
                  accuracy:
                    backendIntervention.start_location_accuracy as number,
                }
              : undefined,
            ppf_zones: backendIntervention.ppf_zones_config as
              | string[]
              | undefined,
            notes: backendIntervention.notes as string | undefined,
          };
          return mappedIntervention;
        }
        return null;
      } catch (error) {
        logger.error(
          LogDomain.TASK,
          "Error in loadActiveInterventionQuery",
          error instanceof Error ? error : new Error(String(error)),
          { task_id: currentTaskId },
        );
        throw error;
      }
    },
    enabled: !!taskId,
  });

  // Load steps for the active intervention
  const loadInterventionStepsQuery = useQuery<
    PPFInterventionStep[],
    Error,
    PPFInterventionStep[],
    (string | undefined)[]
  >({
    queryKey: interventionKeys.steps(
      loadActiveInterventionQuery.data?.id || "",
    ),
    queryFn: async ({ queryKey }) => {
      const interventionId = queryKey[1];
      if (!interventionId) {
        return [];
      }

      try {
        const result =
          await interventionWorkflowService.getInterventionSteps(
            interventionId,
          );

        if (result.success && result.data) {
          return result.data.data;
        }
        return [];
      } catch (error) {
        logger.error(
          LogDomain.TASK,
          "Failed to load intervention steps",
          error instanceof Error ? error : new Error(String(error)),
          { intervention_id: interventionId },
        );
        return [];
      }
    },
    enabled: !!loadActiveInterventionQuery.data?.id,
    retry: false,
  });

  // Update local state when data changes
  useEffect(() => {
    const interventionData = loadActiveInterventionQuery.data;
    const stepsData = loadInterventionStepsQuery.data;

    if (loadActiveInterventionQuery.isFetched) {
      onInterventionLoaded?.(interventionData || null);

      if (
        interventionData &&
        interventionData.id &&
        stepsData &&
        stepsData.length > 0
      ) {
        onStepsLoaded?.(stepsData);
        onCurrentStepUpdate?.(
          stepsData.find((s) => s.step_status === "in_progress") ||
            stepsData.find(
              (s) => s.step_number === interventionData.currentStep,
            ) ||
            null,
        );
      } else {
        onStepsLoaded?.([]);
        onCurrentStepUpdate?.(null);
      }
    }
  }, [
    loadActiveInterventionQuery.data,
    loadActiveInterventionQuery.isFetched,
    loadInterventionStepsQuery.data,
    onInterventionLoaded,
    onStepsLoaded,
    onCurrentStepUpdate,
  ]);

  return {
    // Queries
    loadActiveInterventionQuery,
    loadInterventionStepsQuery,

    // Computed state
    isLoading:
      loadActiveInterventionQuery.isLoading ||
      loadInterventionStepsQuery.isLoading,
    error:
      loadActiveInterventionQuery.error || loadInterventionStepsQuery.error,
    hasIntervention: !!loadActiveInterventionQuery.data,
    hasSteps: !!loadInterventionStepsQuery.data?.length,
  };
}
