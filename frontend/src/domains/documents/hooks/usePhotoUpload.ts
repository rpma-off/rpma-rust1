import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { taskPhotoService } from '../server';

import { PhotoUploadProps as PhotoUploadOptions, UploadItem as PhotoUploadProgress } from '@/types/photo.types';

const DEFAULT_OPTIONS: Partial<PhotoUploadOptions> = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  bucket: 'photos',
  pathPrefix: '',
  autoUpload: true,
  retryAttempts: 3,
  retryDelay: 1000,
};

export function usePhotoUpload(
  taskIdOrBucket: string,
  typeOrPathPrefix?: 'before' | 'after' | 'during' | string
) {
  // Handle different calling patterns for backward compatibility
  let taskId: string;
  let type: 'before' | 'after' | 'during';

  // Pattern 1: usePhotoUpload(taskId, type, bucket, pathPrefix) - new pattern
  if (typeOrPathPrefix && ['before', 'after', 'during'].includes(typeOrPathPrefix as string)) {
    taskId = taskIdOrBucket;
    type = typeOrPathPrefix as 'before' | 'after' | 'during';
  }
  // Pattern 2: usePhotoUpload(bucket, pathPrefix) - legacy pattern
  else {
    taskId = ''; // Will be set later via uploadPhoto parameters
    type = 'during'; // Default
  }
  const [uploads, setUploads] = useState<PhotoUploadProgress[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compress image before upload
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      // Skip compression for non-image files or if compression is disabled
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 2000;
          const maxHeight = 2000;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Resize image
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality 0.8
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name,
                  { type: 'image/jpeg', lastModified: Date.now() }
                );
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Upload a single photo with enhanced service integration
  const uploadPhoto = useCallback(
    async (file: File, options: Partial<PhotoUploadOptions> & { taskId?: string; type?: 'before' | 'after' | 'during' } = {}): Promise<string> => {
      // Use taskId from options if provided (legacy pattern), otherwise use hook taskId
      const effectiveTaskId = options.taskId || taskId;
      const effectiveType = options.type || type;
      
      if (!effectiveTaskId) {
        throw new Error('Task ID is required for photo upload');
      }
      const {
        maxFileSize = DEFAULT_OPTIONS.maxFileSize!,
        allowedTypes = DEFAULT_OPTIONS.allowedTypes!,
      } = options;

      // Validate file using service pattern
      if (file.size > maxFileSize) {
        throw new Error(`File size exceeds the maximum allowed size of ${maxFileSize / (1024 * 1024)}MB`);
      }

      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed`);
      }

      const uploadId = uuidv4();
      // Add to uploads state
      setUploads((prev) => [
        ...prev,
        {
          id: uploadId,
          file,
          status: 'queued',
          progress: 0,
        },
      ]);

      // Offline photo sync is not implemented yet; fail explicitly instead of pretending success.
      if (!isOnline) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: 'error' as const, error: 'Upload photo indisponible hors ligne' }
              : u
          )
        );
        throw new Error('Upload photo indisponible hors ligne');
      }

      // If online, process immediately using service
      try {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, status: 'uploading' as const } : u
          )
        );

        // Compress image if needed (moved here to maintain hook responsibility)
        const processedFile = await compressImage(file);

        // Upload using TaskPhotoService with proper ServiceResponse handling
        const result = await taskPhotoService.uploadPhoto(processedFile, effectiveTaskId, effectiveType, {
          stepId: options.stepId,
          description: `${options.description || ''} (Notes: ${options.notes || ''})`,
          gpsLocation: options.gpsLocation,
        });

        // Handle ServiceResponse pattern properly
        if (!result.success || result.error) {
          throw new Error(result.error || 'Upload failed');
        }

        // Extract URL from response
        const publicUrl = result.photo?.url;

        console.log('[usePhotoUpload] Upload successful, got URL:', publicUrl);

        if (!publicUrl) {
          throw new Error('Upload complete but no URL was returned.');
        }

        // Update status to completed
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? {
                  ...u,
                  status: 'completed' as const,
                  progress: 100,
                  url: publicUrl,
                }
              : u
          )
        );

        return publicUrl;
      } catch (error) {
        console.error('Error uploading file:', error);
        
        // Update status to error
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? {
                  ...u,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : u
          )
        );

        throw error;
      }
    },
    [taskId, type, isOnline, compressImage]
  );

  // Upload multiple photos
  const uploadPhotos = useCallback(
    async (files: File[], options?: Partial<PhotoUploadOptions> & { taskId?: string; type?: 'before' | 'after' | 'during' }): Promise<string[]> => {
      const results = await Promise.allSettled(
        files.map((file) => uploadPhoto(file, options))
      );
      
      return results.map((result) => 
        result.status === 'fulfilled' ? result.value : ''
      ).filter(Boolean);
    },
    [uploadPhoto]
  );

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== 'completed'));
  }, []);

  return {
    uploadPhoto,
    uploadPhotos,
    uploads,
    clearCompleted,
    isOnline,
  };
}

export default usePhotoUpload;

