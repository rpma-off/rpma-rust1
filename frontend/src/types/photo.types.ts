export interface PhotoUploadProps {
  // Core props
  taskId?: string;
  stepId?: string;
  type?: 'before' | 'during' | 'after';

  // Upload configuration
  bucket?: string;
  pathPrefix?: string;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  autoUpload?: boolean;
  retryAttempts?: number;
  retryDelay?: number;

  // Additional metadata
  notes?: string;
  description?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  // UI configuration
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  showProgress?: boolean;
  showDelete?: boolean;

   // Callbacks
   onUploadComplete?: (urls: string[]) => void;
   onUploadError?: (error: string) => void;
   onPhotoDelete?: (photoId: string) => void;
   onSuccess?: () => void;
   onError?: (error: Error) => void;

  // Existing photos
  existingPhotos?: Photo[];

  // Labels and text
  title?: string;
  uploadButtonText?: string;
  dragDropText?: string;

  // Validation
  required?: boolean;
  minPhotos?: number;
  maxPhotos?: number;
}

// Import and re-export backend types
import type { Photo, PhotoType, PhotoCategory } from '@/lib/backend';

export type { Photo, PhotoType, PhotoCategory };

export interface UploadItem {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

export interface PhotoGalleryProps {
  photos: Photo[];
  interventionId?: string;
  title?: string;
  description?: string;
  layout?: PhotoGalleryLayout;
  gridCols?: number;
  showMetadata?: boolean;
  showActions?: boolean;
  onPhotoClick?: (photo: Photo) => void;
  onPhotoDelete?: (photoId: string) => void;
  onPhotoDownload?: (photo: Photo) => void;
  filterByType?: 'all' | PhotoType;
  sortBy?: PhotoSortBy;
  sortOrder?: PhotoSortOrder;
  onDelete?: (photoId: string) => void;
  onSelect?: (photo: Photo) => void;
  className?: string;
}

export interface PhotoUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface PhotoUploadRequest {
  taskId: string;
  stepId?: string;
  files: File[];
  type: PhotoType;
  metadata?: PhotoMetadata;
}

export interface PhotoMetadata {
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp?: number;
  device?: string;
  notes?: string;
}

export interface PhotoQualityAssessment {
  score: number;
  issues: string[];
  recommendations: string[];
}

export type PhotoStatus = 'pending' | 'uploaded' | 'failed';
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface PhotoUploadResponse {
  success: boolean;
  uploadedUrls: string[];
  failedUploads: string[];
  error?: string;
}

export interface PhotoGalleryFilters {
  type?: PhotoType;
  status?: PhotoStatus;
  dateRange?: { start: Date; end: Date };
  uploadedBy?: string;
}

export type PhotoSortBy = 'date' | 'type' | 'size' | 'name';
export type PhotoSortOrder = 'asc' | 'desc';

export type PhotoGalleryLayout = 'grid' | 'list' | 'masonry';

export interface PhotoUploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: UploadStatus;
  error?: string;
}

export interface PhotoUploadOptions {
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  autoUpload?: boolean;
  showPreview?: boolean;
}

export interface PhotoFile {
  file: File;
  id: string;
  preview?: string;
  metadata?: PhotoMetadata;
}

export interface PhotoStatistics {
  totalPhotos: number;
  uploadedPhotos: number;
  failedUploads: number;
  totalSize: number;
}

export interface PhotoExportOptions {
  format: 'zip' | 'pdf';
  includeMetadata: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface PhotoExportRequest {
  photoIds: string[];
  options: PhotoExportOptions;
}

export type PhotoQuality = 'low' | 'medium' | 'high' | 'excellent';