// PPF Photo service

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

  static async uploadPhoto(interventionId: string, stepNumber: number, file: File): Promise<PPFPhoto> {
    try {
      // Mock implementation
      return {
        id: 'photo-' + Date.now(),
        interventionId,
        stepId: `step-${stepNumber}`,
        url: 'mock-url',
        filename: file.name,
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to upload photo');
    }
  }

  static async getPhotos(interventionId: string, stepNumber?: number): Promise<PPFPhoto[]> {
    try {
      // Mock implementation
      return [
        {
          id: 'photo-1',
          interventionId,
          stepId: stepNumber ? `step-${stepNumber}` : 'step-1',
          url: 'mock-url-1',
          filename: 'photo1.jpg',
          uploadedAt: new Date(),
        },
      ];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get photos');
    }
  }

  static async deletePhoto(photoId: string): Promise<void> {
    try {
      // Mock implementation
      console.log('Deleting photo', photoId);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete photo');
    }
  }

  static async getInterventionPhotosWithMetadata(interventionId: string): Promise<PPFPhoto[]> {
    try {
      // Mock implementation
      return await this.getPhotos(interventionId);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get intervention photos with metadata');
    }
  }

  static async getPhotosForIntervention(interventionId: string): Promise<PPFPhoto[]> {
    // Implementation
    return this.getPhotos(interventionId);
  }
}

export const ppfPhotoService = PPFPhotoService;