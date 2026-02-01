'use client';

// Define shimmer animation keyframes
const shimmerAnimation = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Clock, WifiOff, Camera, X, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import usePhotoUpload from '@/hooks/usePhotoUpload';

import { PhotoUploadProps } from '@/types/photo.types';

export function PhotoUpload({
  // Core props
  taskId,
  stepId: _stepId,
  type = 'before',
  
  // Upload configuration
  bucket = 'task-photos',
  pathPrefix = '',
  maxFiles = 10,
  maxFileSize = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  
  // UI configuration
  className,
  disabled = false,
  showPreview = true,
  showProgress = true,
  showDelete = true,
  
  // Callbacks
  onUploadComplete,
  onUploadError,
  onPhotoDelete,
  
  // Existing photos
  existingPhotos = [],
  
  // Labels and text
  title,
  description,
  uploadButtonText = 'Upload photos',
  dragDropText = 'Drag and drop photos here, or click to select',
  
  // Validation
  required = false,
  minPhotos = 0,
  maxPhotos = 10,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { uploadPhoto, isOnline, clearCompleted, uploads } = usePhotoUpload(bucket, pathPrefix);

  // Derived state to track uploading status
  const hasActiveUploads = uploads.some(upload => upload.status === 'uploading' || upload.status === 'queued');

  // Update uploading state when uploads change
  useEffect(() => {
    setIsUploading(hasActiveUploads);
  }, [hasActiveUploads]);

  // Type-specific configurations
  const typeConfig = {
    before: {
      label: 'Avant intervention',
      color: 'bg-red-100 text-red-800',
      icon: Camera,
    },
    during: {
      label: 'Pendant intervention',
      color: 'bg-yellow-100 text-yellow-800',
      icon: Camera,
    },
    after: {
      label: 'Après intervention',
      color: 'bg-green-100 text-green-800',
      icon: Camera,
    },
  };

  const currentTypeConfig = typeConfig[type];

  // Process and upload files
  const handleFiles = useCallback(
    async (files: File[]) => {
      if (disabled) return;

      // Clear previous errors
      setUploadError(null);

      // Check if we have files
      if (!files || files.length === 0) {
        const error = 'No files selected for upload.';
        setUploadError(error);
        onUploadError?.(error);
        return;
      }

      // Check max files
      if (files.length > maxFiles) {
        const error = `You can only upload up to ${maxFiles} files at a time.`;
        setUploadError(error);
        onUploadError?.(error);
        return;
      }

      // Detailed file validation with specific error messages
      const invalidSizeFiles = files.filter(
        (file) => file.size > maxFileSize * 1024 * 1024
      );

      const invalidTypeFiles = files.filter(
        (file) => !allowedTypes.includes(file.type)
      );

      if (invalidSizeFiles.length > 0) {
        const fileNames = invalidSizeFiles.map(f => f.name).join(', ');
        const error = `Files too large: ${fileNames}. Maximum size is ${maxFileSize}MB.`;
        setUploadError(error);
        onUploadError?.(error);
        return;
      }

      if (invalidTypeFiles.length > 0) {
        const fileNames = invalidTypeFiles.map(f => f.name).join(', ');
        const allowedTypesStr = allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ');
        const error = `Invalid file types: ${fileNames}. Allowed formats: ${allowedTypesStr}.`;
        setUploadError(error);
        onUploadError?.(error);
        return;
      }

      try {
        console.log('Starting upload process for', files.length, 'files');

        // Process files in series to avoid overwhelming network
        const results: Array<PromiseSettledResult<unknown>> = [];
        for (const file of files) {
          try {
            console.log('Uploading file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
            const result = await uploadPhoto(file, {
              taskId: taskId || '',  // Make sure taskId is always provided
              type: type,
              maxFileSize: maxFileSize * 1024 * 1024,
              allowedTypes,
              onSuccess: () => {
                console.log('File upload success:', file.name);
              },
              onError: (error: Error) => {
                console.error('Upload error for file', file.name + ':', error);
                onUploadError?.(error.message || 'Failed to upload photo.');
              },
            });
            results.push({ status: 'fulfilled', value: result });
          } catch (err) {
            console.error('Error uploading file', file.name + ':', err);
            results.push({ status: 'rejected', reason: err });
          }
        }

        const successfulUploads = results
          .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
          .map((result) => result.value);

        if (successfulUploads.length === 0) {
          const error = 'All uploads failed. Please check your connection and try again.';
          setUploadError(error);
          onUploadError?.(error);
          return;
        }

        if (successfulUploads.length > 0 && onUploadComplete) {
          console.log('Successfully uploaded', successfulUploads.length, 'files');
          onUploadComplete(successfulUploads);
        }

        // Show warning if some files failed
        if (successfulUploads.length < files.length) {
          const error = `${files.length - successfulUploads.length} out of ${files.length} files failed to upload.`;
          setUploadError(error);
          onUploadError?.(error);
        }
      } catch (error) {
        console.error('Critical error uploading files:', error);
        const errorMessage = 'An error occurred while uploading files. Please try again later.';
        setUploadError(errorMessage);
        onUploadError?.(errorMessage);
      }
    },
    [uploadPhoto, maxFiles, maxFileSize, allowedTypes, onUploadComplete, onUploadError, disabled, taskId, type]
  );

  // Handle file selection
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      await handleFiles(Array.from(files));
      
      // Reset the input value to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  // Dropzone configuration
  const { getRootProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: maxPhotos - existingPhotos.length,
    disabled: disabled || existingPhotos.length >= maxPhotos,
  });

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'uploading':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      default:
        return null;
    }
  };

  // Clear completed uploads
  const handleClearCompleted = () => {
    clearCompleted();
  };

  const canUploadMore = existingPhotos.length < maxPhotos;
  const isRequired = required && existingPhotos.length === 0;

  return (
    <>
      {/* Add shimmer animation styles */}
      <style dangerouslySetInnerHTML={{ __html: shimmerAnimation }} />

    <div className={cn('w-full', className)}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <div className="flex items-center space-x-2 mb-2">
              <currentTypeConfig.icon className="h-5 w-5 text-gray-500" />
              <h3 className="text-sm font-medium">{title}</h3>
              <Badge variant="outline" className={currentTypeConfig.color}>
                {existingPhotos.length}/{maxPhotos}
              </Badge>
            </div>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}

      {/* Upload Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors relative',
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed',
          isUploading && 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/10',
          isRequired && 'border-red-300 bg-red-50'
        )}
        {...getRootProps()}
      >
        {isUploading && (
          <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 text-xs font-medium rounded-full animate-pulse">
            Uploading...
          </div>
        )}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="text-sm text-muted-foreground">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
            >
              <span>{uploadButtonText}</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                multiple
                onChange={handleFileChange}
                accept={allowedTypes.join(',')}
                disabled={disabled || !canUploadMore}
                ref={fileInputRef}
              />
            </label>{' '}
            {dragDropText}
          </div>
          <p className="text-xs text-muted-foreground">
            {allowedTypes.map((type) => type.split('/')[1]).join(', ').toUpperCase()} up to {maxFileSize}MB
          </p>
          {!isOnline && (
            <div className="flex items-center text-xs bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 mt-2 p-2 rounded-md">
              <WifiOff className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>
                <strong>Working offline</strong> - Photos will be saved locally and uploaded automatically when you&apos;re back online. You can continue with your workflow.
              </span>
            </div>
          )}
          {isRequired && (
            <div className="text-xs text-red-600">
              * Required - At least {minPhotos} photo(s) needed
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {uploadError && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {showProgress && uploads.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Uploads</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCompleted}
              disabled={!uploads.some((u) => u.status === 'completed')}
            >
              Clear completed
            </Button>
          </div>
          
          <div className="space-y-2">
            {uploads.map((upload) => (
              <div key={upload.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 truncate">
                    {getStatusIcon(upload.status)}
                    <span className="truncate" title={upload.file.name}>
                      {upload.file.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(upload.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                {upload.status === 'uploading' && (
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 dark:bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress || 0}%` }}
                    />
                    {upload.progress === undefined && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" style={{ animation: 'shimmer 1.5s infinite' }} />
                    )}
                  </div>
                )}
                {upload.error && (
                  <p className="text-xs text-red-500">{upload.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Gallery */}
      {showPreview && existingPhotos.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-3">Uploaded Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="relative w-full h-32">
                   <Image
                     src={photo.storage_url || ''}
                     alt={photo.file_name || 'Uploaded photo'}
                     fill
                     className="object-cover rounded-lg border"
                     onError={(e) => {
                       const target = e.target as HTMLImageElement;
                       target.onerror = null;
                       target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                     }}
                     unoptimized={photo.storage_url?.startsWith('data:') || false}
                  />
                </div>
                
                {/* Photo Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewPhoto(photo.storage_url || photo.file_path)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {showDelete && onPhotoDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onPhotoDelete(photo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Photo Info */}
                {photo.uploaded_at && (
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {new Date(Number(photo.uploaded_at)).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-black/80 hover:text-white"
              onClick={() => setPreviewPhoto(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <Image
              src={previewPhoto}
              alt="Photo preview"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default PhotoUpload;
