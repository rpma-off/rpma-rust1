// PPF Photo service
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';

export interface PPFPhoto {
  id: string;
  interventionId: string;
  stepId: string;
  url: string;
  filename: string;
  uploadedAt: Date;
  angle?: string;
  gpsCoordinates?: { lat: number; lon: number; accuracy?: number };
  qualityScore?: number;
}

export interface MobileCameraConfig {
  resolution?: { width: number; height: number };
  quality?: number;
  flash?: boolean;
  zoom?: number;
  focusMode?: 'auto' | 'manual' | 'continuous';
  iso?: number;
  aperture?: number;
  shutterSpeed?: number;
  whiteBalance?: string;
}

export interface RealTimeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export class PPFPhotoService {
  static getInstance() {
    return PPFPhotoService;
  }

  private static async getSessionToken(): Promise<string> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new Error('Authentication required');
    }
    return session.token;
  }

  private static mapPhotoResponse(photo: Record<string, unknown>, interventionId: string): PPFPhoto {
    return {
      id: String(photo.id || ''),
      interventionId: String(photo.intervention_id || interventionId),
      stepId: String(photo.step_id || ''),
      url: String(photo.file_path || photo.url || ''),
      filename: String(photo.file_name || photo.filename || ''),
      uploadedAt: photo.created_at ? new Date(String(photo.created_at)) : new Date(),
      angle: photo.angle ? String(photo.angle) : undefined,
      gpsCoordinates: photo.gps_coordinates as PPFPhoto['gpsCoordinates'],
      qualityScore: typeof photo.quality_score === 'number' ? photo.quality_score : undefined,
    };
  }

  static async uploadPhoto(interventionId: string, _stepNumber: number, file: File): Promise<PPFPhoto> {
    try {
      const token = await this.getSessionToken();
      const result = await ipcClient.photos.upload(
        interventionId,
        file.name,
        'intervention',
        token
      );

      const raw = result as unknown as Record<string, unknown>;
      return this.mapPhotoResponse(raw, interventionId);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to upload photo');
    }
  }

  static async getPhotos(interventionId: string, _stepNumber?: number): Promise<PPFPhoto[]> {
    try {
      const token = await this.getSessionToken();
      const photos = await ipcClient.photos.list(interventionId, token);

      return (photos as unknown as Array<Record<string, unknown>>).map(photo =>
        this.mapPhotoResponse(photo, interventionId)
      );
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get photos');
    }
  }

  static async deletePhoto(photoId: string): Promise<void> {
    try {
      const token = await this.getSessionToken();
      await ipcClient.photos.delete(photoId, token);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete photo');
    }
  }

  static async getInterventionPhotosWithMetadata(interventionId: string): Promise<PPFPhoto[]> {
    return this.getPhotos(interventionId);
  }

  static async getPhotosForIntervention(interventionId: string): Promise<PPFPhoto[]> {
    return this.getPhotos(interventionId);
  }
}

export const ppfPhotoService = PPFPhotoService;