export interface QualityIssue {
  id: string;
  description: string;
  category: 'photo_quality' | 'process_compliance' | 'material_quality' | 'environmental' | 'safety';
  severity: 'critical' | 'high' | 'medium' | 'low';
  createdAt: Date;
}

export interface QualityCheckpoint {
  id: string;
  stepId: number;
  checkpointType: string;
  status: 'passed' | 'failed' | 'escalated' | 'pending';
  performedBy: string;
  issues: QualityIssue[];
  correctiveActions: CorrectiveAction[];
  reviewRequired: boolean;
  createdAt: Date;
}

export interface CorrectiveAction {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
}

export interface QualityControlWorkflow {
  id: string;
  interventionId: string;
  checkpoints: QualityCheckpoint[];
  qualityScore: number;
  criticalIssues: number;
  reviewRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// PPF Intervention Types
export interface PPFInterventionData {
  id: string;
  taskId: string;
  task_id?: string;
  intervention_number?: string;
  steps: PPFInterventionStep[];
  status: "pending" | "in_progress" | "completed" | "finalizing";
  progress: number;
  progress_percentage?: number; // For compatibility
  currentStep: number;
  completed_steps_count?: number; // For compatibility
  completion_percentage?: number; // For compatibility
  createdAt: string;
  created_at?: string; // For compatibility
  updatedAt: string;
  updated_at?: string; // For compatibility
  technician_id?: string;
  created_by?: string;
  client_id?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_vin?: string;
  vehicle_info?: {
    make?: string;
    model?: string;
    year?: number;
    vin?: string;
  };
  weather_condition?: string;
  temperature_celsius?: number;
  started_at?: string;
  actual_start?: string;
  scheduled_start?: string;
  completed_at?: string;
  intervention_completed_at?: string;
  estimated_duration?: number;
  actual_duration?: number;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  ppf_zones?: string[];
  notes?: string;
}

export interface PPFPhoto {
  id: string;
  url: string;
  angle: keyof typeof PPFPhotoAngle;
  category: keyof typeof PPFPhotoCategory;
  timestamp: string;
  file_size?: number;
  metadata?: Record<string, unknown>;
}

export interface QualityCheckpointData {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'pending';
  notes?: string;
  timestamp: string;
}

export interface PPFInterventionStep {
   id: string;
   interventionId: string;
   intervention_id?: string;  // For compatibility
   stepNumber: number;
   step_number?: number;  // For compatibility
    step_name: string;
    step_type: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
    step_status: string; // 'pending', 'in_progress', 'completed', etc.
   description?: string;
   photos?: PPFPhoto[];  // Photo data
   startedAt?: string;
   started_at?: string;
   completedAt?: string;
   completed_at?: string;
   duration_seconds?: number;
   requires_photos?: boolean;
   min_photos_required?: number;
   photo_count?: number;
   quality_checkpoints?: QualityCheckpointData[];
   qualityChecks?: QualityCheckpointData[];
   approved_by?: string;
   observations?: string[];
   collected_data?: Record<string, unknown>;
   paused_at?: number | null;
   created_at?: string;
   updated_at?: string;
   required: boolean;
 }

export interface StartInterventionDTO {
  taskId: string;
  task_id?: string;
  intervention_number?: string;
  technicianId?: string;
  technician_id?: string;
  scheduled_start?: string;
  estimated_duration?: number;
  weather_condition?: string;
  lighting_condition?: string;
  work_location?: string;
  ppf_zones?: string[];
  custom_zones?: string[];
  film_type?: string;
  film_brand?: string;
  film_model?: string;
  temperature?: number;
  humidity?: number;
  assistant_ids?: string[];
  gps_coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  address?: string;
  notes?: string;
  customer_requirements?: string[];
  special_instructions?: string;
  vehicleInfo?: {
    make?: string;
    model?: string;
    year?: number;
    plate?: string;
    vin?: string;
  };
}

export interface AdvanceStepDTO {
  interventionId: string;
  intervention_id?: string;
  stepNumber: number;
  step_number?: number;
  step_id?: string;
  data?: Record<string, string | number | boolean | unknown[]>;
  collected_data?: Record<string, unknown>;
  observations?: string[];
  photo_urls?: string[];
  measurements?: Record<string, unknown>;
}

export interface FinalizeInterventionDTO {
  interventionId: string;
  intervention_id?: string;
  finalData?: Record<string, string | number | boolean | unknown[]>;
  collected_data?: Record<string, unknown>;
  final_photo_urls?: string[];
  observations?: string[];
  customer_satisfaction?: number;
  quality_score?: number;
  final_observations?: string[];
  customer_signature?: string;
  customer_comments?: string;
}

export interface InterventionCreationResponse {
  success: boolean;
  intervention: PPFInterventionData;
  error?: string;
  steps?: PPFInterventionStep[];
}

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}

export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plate?: string;
  color?: string;
}

export interface StepProgressResponse {
  success: boolean;
  step: PPFInterventionStep;
  intervention: PPFInterventionData;
  next_step?: PPFInterventionStep;
  updated_step?: PPFInterventionStep;
  intervention_progress?: number;
  error?: string;
}

export interface InterventionFinalizationResponse {
  success: boolean;
  intervention: PPFInterventionData;
  completionSummary?: {
    totalTime: number;
    efficiencyRating: number;
    qualityScore: number;
    certificatesGenerated: boolean;
  };
  error?: string;
}

export const PPFPhotoAngle = {
  FRONT_LEFT: 'front_left',
  FRONT_RIGHT: 'front_right',
  FRONT_CENTER: 'front_center',
  REAR_LEFT: 'rear_left',
  REAR_RIGHT: 'rear_right',
  REAR_CENTER: 'rear_center',
  DETAIL_CLOSEUP: 'detail_closeup',
  FULL_VEHICLE: 'full_vehicle',
  OTHER: 'other'
} as const;

export const PPFPhotoCategory = {
  INSPECTION: 'inspection',
  PREPARATION: 'preparation',
  INSTALLATION: 'installation',
  FINALIZATION: 'finalization'
} as const;

export const PPFInterventionStatus = {
  STEP_1_INSPECTION: 'step_1_inspection',
  STEP_2_PREPARATION: 'step_2_preparation',
  STEP_3_INSTALLATION: 'step_3_installation',
  STEP_4_FINALIZATION: 'step_4_finalization',
  FINALIZING: 'finalizing'
} as const;