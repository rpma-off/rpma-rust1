// Type extensions for auto-generated backend types
// This file defines proper types for `any` fields in backend.ts

// Error types
export interface ApiErrorDetails {
  field?: string;
  value?: unknown;
  constraint?: string;
  [key: string]: unknown;
}

// Photo types
export interface PhotoAnnotations {
  tags?: string[];
  faces?: Array<{ x: number; y: number; width: number; height: number }>;
  labels?: Array<{ name: string; confidence: number }>;
}

// Intervention types
export interface PPFZonesExtended {
  [zoneName: string]: {
    status: 'pending' | 'completed' | 'skipped';
    notes?: string;
  };
}

export interface InterventionMetadata {
  version?: string;
  source?: string;
  modifiedBy?: string;
  [key: string]: unknown;
}

export interface DeviceInfo {
  os?: string;
  osVersion?: string;
  appVersion?: string;
  deviceModel?: string;
}

// InterventionStep types
export interface StepInstructions {
  title: string;
  description?: string;
  steps?: string[];
  warnings?: string[];
}

export interface StepData {
  template?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CollectedData {
  measurements?: Record<string, number | string>;
  photos?: string[];
  signatures?: string[];
  [key: string]: unknown;
}

export interface StepMeasurements {
  [key: string]: {
    value: number;
    unit: string;
    tolerance?: number;
    timestamp?: string;
  };
}

export interface ValidationData {
  isValid: boolean;
  errors?: Array<{ field: string; message: string }>;
  warnings?: Array<{ field: string; message: string }>;
}

// Type augmentation to replace `any` types in backend.ts
declare module './backend' {
  export interface ApiError {
    details: ApiErrorDetails;
  }

  export interface Photo {
    annotations: PhotoAnnotations;
  }

  export interface Intervention {
    ppf_zones_extended: PPFZonesExtended;
    metadata: InterventionMetadata;
    device_info: DeviceInfo;
  }

  export interface InterventionStep {
    instructions: StepInstructions;
    step_data: StepData;
    collected_data: CollectedData;
    measurements: StepMeasurements;
    validation_data: ValidationData;
  }

  export interface AdvanceStepRequest {
    collected_data: CollectedData;
  }

  export interface SaveStepProgressRequest {
    collected_data: CollectedData;
  }

  export interface FinalizeInterventionRequest {
    collected_data: CollectedData;
  }

  export interface SyncOperation {
    data: Record<string, unknown>;
  }
}
