// Extended intervention types with better type safety
import type { Intervention as BaseIntervention } from '@/lib/backend';

// Specific collected data types
export interface InspectionData {
  defects: Array<{
    id: string;
    description: string;
    severity: 'minor' | 'major' | 'critical';
    location: { x: number; y: number };
    photos: string[];
  }>;
  preExistingDamage: string[];
  notes: string;
}

export interface PreparationData {
  surfaceTemp: number;
  humidity: number;
  cleaningProducts: Array<{
    name: string;
    quantity: number;
  }>;
  surfacePrepDetails: string;
}

export interface InstallationData {
  filmBrand: string;
  filmType: string;
  filmModel: string;
  applicationTechnique: string;
  temperature: number;
  humidity: number;
  measurements: Array<{
    type: string;
    value: number;
    unit: string;
  }>;
  squeegeePressure: number;
}

export interface FinalizationData {
  customerSatisfaction: number;
  finalInspection: Array<{
    area: string;
    defects: string[];
    notes: string;
  }>;
  photos: string[];
  completionNotes: string;
}

export interface QualityCheckData {
  passesInspection: boolean;
  score: number;
  issues: Array<{
    type: 'bubble' | 'contamination' | 'peel' | 'edge';
    location: { x: number; y: number };
    severity: 'minor' | 'major' | 'critical';
    photo?: string;
  }>;
}

// Type guards
export function isInspectionData(obj: unknown): obj is InspectionData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'defects' in obj &&
    'preExistingDamage' in obj &&
    'notes' in obj
  );
}

export function isPreparationData(obj: unknown): obj is PreparationData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'surfaceTemp' in obj &&
    'humidity' in obj &&
    'cleaningProducts' in obj
  );
}

export function isInstallationData(obj: unknown): obj is InstallationData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'filmBrand' in obj &&
    'filmType' in obj &&
    'filmModel' in obj &&
    'temperature' in obj
  );
}

export function isFinalizationData(obj: unknown): obj is FinalizationData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'customerSatisfaction' in obj &&
    'finalInspection' in obj &&
    'photos' in obj
  );
}

export function isQualityCheckData(obj: unknown): obj is QualityCheckData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'passesInspection' in obj &&
    'score' in obj &&
    'issues' in obj
  );
}

// Extended intervention with proper typing
export interface InterventionExtended extends Omit<BaseIntervention, 'collected_data' | 'metadata' | 'device_info'> {
  collected_data?: {
    inspection?: InspectionData;
    preparation?: PreparationData;
    installation?: InstallationData;
    finalization?: FinalizationData;
  };
  metadata?: {
    appVersion: string;
    deviceFingerprint: string;
    browserInfo: {
      userAgent: string;
      language: string;
      timezone: string;
    };
  };
  device_info?: {
    platform: string;
    version: string;
    architecture: string;
  };
}