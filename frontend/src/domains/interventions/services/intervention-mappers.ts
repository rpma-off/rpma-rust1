import type { PPFInterventionData, PPFInterventionStep } from '@/types/ppf-intervention';

export interface BackendStep {
  id: string;
  intervention_id: string;
  step_number: number;
  step_name: string;
  step_type: string;
  step_status: string;
  description?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  requires_photos?: boolean;
  min_photos_required?: number;
  photo_count?: number;
  quality_checkpoints?: Record<string, unknown>[];
  approved_by?: string;
  observations?: string[];
  collected_data?: Record<string, unknown>;
  paused_at?: number | null;
  created_at?: string;
  updated_at?: string;
  is_mandatory?: boolean;
}

export interface BackendIntervention {
  id: string;
  task_number?: string;
  status: string;
  completion_percentage?: number;
  current_step?: number;
  currentStep?: number;
  created_at?: string;
  updated_at?: string;
  technician_id?: string;
  created_by?: string;
  client_id?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_vin?: string;
  weather_condition?: string;
  temperature_celsius?: number;
  started_at?: string;
  scheduled_at?: string;
  completed_at?: string;
  estimated_duration?: number;
  actual_duration?: number;
  start_location_lat?: number;
  start_location_lon?: number;
  start_location_accuracy?: number;
  ppf_zones_config?: string[];
  notes?: string;
}

export function mapBackendStepToFrontend(step: BackendStep): PPFInterventionStep {
  return {
    id: step.id,
    interventionId: step.intervention_id,
    intervention_id: step.intervention_id,
    stepNumber: step.step_number,
    step_number: step.step_number,
    step_name: step.step_name,
    step_type: step.step_type,
    status: step.step_status,
    step_status: step.step_status,
    description: step.description,
    photos: [],
    startedAt: step.started_at,
    started_at: step.started_at,
    completedAt: step.completed_at,
    completed_at: step.completed_at,
    duration_seconds: step.duration_seconds,
    requires_photos: step.requires_photos,
    min_photos_required: step.min_photos_required,
    photo_count: step.photo_count,
    quality_checkpoints: step.quality_checkpoints,
    qualityChecks: step.quality_checkpoints,
    approved_by: step.approved_by,
    observations: step.observations,
    collected_data: step.collected_data || (step.observations ? { observations: step.observations } : {}),
    paused_at: step.paused_at,
    created_at: step.created_at,
    updated_at: step.updated_at,
    required: !step.is_mandatory ? false : true,
  } as PPFInterventionStep;
}

// Both camelCase and snake_case aliases are intentionally preserved so that
// callers built against either convention can consume this partial update.
export function mapBackendStepPartialUpdate(step: BackendStep): {
  status: string;
  step_status: string;
  completedAt: string | undefined;
  completed_at: string | undefined;
  duration_seconds: number | undefined;
  photo_count: number | undefined;
  observations: string[] | undefined;
  collected_data: Record<string, unknown>;
  updated_at: string | undefined;
} {
  return {
    status: step.step_status,
    step_status: step.step_status,
    completedAt: step.completed_at,
    completed_at: step.completed_at,
    duration_seconds: step.duration_seconds,
    photo_count: step.photo_count,
    observations: step.observations,
    collected_data: step.collected_data || (step.observations ? { observations: step.observations } : {}),
    updated_at: step.updated_at,
  };
}

export function mapBackendInterventionToFrontend(
  backendIntervention: BackendIntervention,
  fallbackTaskId: string,
): PPFInterventionData {
  return {
    id: backendIntervention.id,
    taskId: backendIntervention.task_number ?? fallbackTaskId,
    task_id: backendIntervention.task_number,
    intervention_number: backendIntervention.task_number,
    steps: [],
    status: backendIntervention.status,
    progress: backendIntervention.completion_percentage ?? 0,
    progress_percentage: backendIntervention.completion_percentage,
    currentStep: backendIntervention.current_step ?? 0,
    completion_percentage: backendIntervention.completion_percentage,
    createdAt: backendIntervention.created_at ?? '',
    created_at: backendIntervention.created_at,
    updatedAt: backendIntervention.updated_at ?? '',
    updated_at: backendIntervention.updated_at,
    technician_id: backendIntervention.technician_id,
    created_by: backendIntervention.created_by,
    client_id: backendIntervention.client_id,
    vehicle_make: backendIntervention.vehicle_make,
    vehicle_model: backendIntervention.vehicle_model,
    vehicle_year: backendIntervention.vehicle_year,
    vehicle_vin: backendIntervention.vehicle_vin,
    vehicle_info: backendIntervention.vehicle_make ? {
      make: backendIntervention.vehicle_make,
      model: backendIntervention.vehicle_model,
      year: backendIntervention.vehicle_year,
      vin: backendIntervention.vehicle_vin,
    } : undefined,
    weather_condition: backendIntervention.weather_condition,
    temperature_celsius: backendIntervention.temperature_celsius,
    started_at: backendIntervention.started_at,
    actual_start: backendIntervention.started_at,
    scheduled_start: backendIntervention.scheduled_at,
    completed_at: backendIntervention.completed_at,
    intervention_completed_at: backendIntervention.completed_at,
    estimated_duration: backendIntervention.estimated_duration,
    actual_duration: backendIntervention.actual_duration,
    gps_coordinates: backendIntervention.start_location_lat != null && backendIntervention.start_location_lon != null ? {
      latitude: backendIntervention.start_location_lat,
      longitude: backendIntervention.start_location_lon,
      accuracy: backendIntervention.start_location_accuracy,
    } : undefined,
    ppf_zones: backendIntervention.ppf_zones_config,
    notes: backendIntervention.notes,
  } as PPFInterventionData;
}
