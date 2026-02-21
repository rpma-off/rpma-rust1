/**
 * Photo Upload Zone Component
 */

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface PhotoUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export const PhotoUploadZone: React.FC<PhotoUploadZoneProps> = ({
  onFilesSelected,
  accept: _accept = 'image/*',
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  className = '',
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.heic', '.webp'],
    },
    maxFiles,
    maxSize,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium text-gray-900 mb-2">
        {isDragActive ? 'Déposez les photos ici' : 'Glissez-déposez des photos'}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        ou cliquez pour sélectionner des fichiers
      </p>
      <p className="text-xs text-gray-400">
        Formats acceptés: JPEG, PNG, HEIC, WebP (max {maxFiles} fichiers, {Math.round(maxSize / 1024 / 1024)}MB chacun)
      </p>
    </div>
  );
};

export default PhotoUploadZone;