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
  if (obj === null || typeof obj !== 'object') return false;
  const record = obj as Record<string, unknown>;
  return (
    'id' in record &&
    'text' in record &&
    'x' in record &&
    'y' in record &&
    'type' in record &&
    typeof record.type === 'string' &&
    ['note', 'defect', 'measurement'].includes(record.type)
  );
}

export function isPhotoLocation(obj: unknown): obj is PhotoLocation {
  if (obj === null || typeof obj !== 'object') return false;
  const record = obj as Record<string, unknown>;
  return (
    'latitude' in record &&
    'longitude' in record &&
    typeof record.latitude === 'number' &&
    typeof record.longitude === 'number' &&
    (record.accuracy === undefined || typeof record.accuracy === 'number')
  );
}

export function isPhotoQualityMetrics(obj: unknown): obj is PhotoQualityMetrics {
  if (obj === null || typeof obj !== 'object') return false;
  const record = obj as Record<string, unknown>;
  return (
    'score' in record &&
    'blur' in record &&
    'exposure' in record &&
    'composition' in record &&
    typeof record.score === 'number' &&
    typeof record.blur === 'number' &&
    typeof record.exposure === 'number' &&
    typeof record.composition === 'number'
  );
}