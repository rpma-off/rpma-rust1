// Extended photo types with better type safety
import type { Photo as BasePhoto } from '@/lib/backend';

// Specific annotation types
export interface PhotoAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  type: 'note' | 'defect' | 'measurement';
}

// GPS location with proper typing
export interface PhotoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Quality metrics with specific types
export interface PhotoQualityMetrics {
  score: number;
  blur: number;
  exposure: number;
  composition: number;
}

// Extended photo interface
export interface PhotoExtended extends Omit<BasePhoto, 'annotations' | 'gps_location'> {
  annotations?: PhotoAnnotation[] | null;
  gps_location?: PhotoLocation | null;
  quality_metrics?: PhotoQualityMetrics | null;
}

// Type guards for photo types
export function isPhotoAnnotation(obj: unknown): obj is PhotoAnnotation {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'text' in obj &&
    'x' in obj &&
    'y' in obj &&
    'type' in obj &&
    ['note', 'defect', 'measurement'].includes((obj as any).type)
  );
}

export function isPhotoLocation(obj: unknown): obj is PhotoLocation {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'latitude' in obj &&
    'longitude' in obj &&
    typeof (obj as any).latitude === 'number' &&
    typeof (obj as any).longitude === 'number' &&
    ((obj as any).accuracy === undefined || typeof (obj as any).accuracy === 'number')
  );
}

export function isPhotoQualityMetrics(obj: unknown): obj is PhotoQualityMetrics {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'score' in obj &&
    'blur' in obj &&
    'exposure' in obj &&
    'composition' in obj &&
    typeof (obj as any).score === 'number' &&
    typeof (obj as any).blur === 'number' &&
    typeof (obj as any).exposure === 'number' &&
    typeof (obj as any).composition === 'number'
  );
}