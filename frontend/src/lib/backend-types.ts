// Type definitions for `any` fields in backend.ts
// Import these types explicitly to use instead of `any`

import type { JsonObject, JsonValue } from '@/types/json';

// Error types
export interface ApiErrorDetails {
  field?: string;
  value?: JsonValue;
  constraint?: string;
  [key: string]: JsonValue | undefined;
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
  [key: string]: JsonValue | undefined;
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
  template?: JsonObject;
  configuration?: JsonObject;
  [key: string]: JsonValue | undefined;
}

export interface CollectedData {
  measurements?: Record<string, number | string>;
  photos?: string[];
  signatures?: string[];
  [key: string]: JsonValue | undefined;
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
