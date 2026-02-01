// Main PhotoUpload component
export { default as PhotoUpload } from './PhotoUpload';

// PhotoUploadZone component for simplified usage
export { default as PhotoUploadZone } from './PhotoUploadZone';

// PhotoGallery component for displaying photos
export { default as PhotoGallery } from './PhotoGallery';

// Re-export types from unified photo types
export type {
  PhotoUploadProps,
  PhotoUploadZoneProps,
  PhotoGalleryProps,
  Photo,
  PhotoUploadRequest,
  PhotoUploadResponse,
  PhotoMetadata,
  PhotoQualityAssessment,
  PhotoGalleryFilters,
  PhotoSortBy,
  PhotoSortOrder,
  PhotoGalleryLayout,
  PhotoUploadProgress,
  PhotoUploadOptions,
  PhotoFile,
  PhotoStatistics,
  PhotoExportOptions,
  PhotoExportRequest,
  UploadStatus,
  PhotoType,
  PhotoStatus,
  PhotoQuality
} from '@/types/photo.types';
