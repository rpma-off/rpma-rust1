'use client';

import React from 'react';
import { PhotoUpload } from './PhotoUpload';
import { PhotoUploadProps } from '@/types/photo.types';

export interface PhotoUploadZoneProps extends Omit<PhotoUploadProps, 'showProgress' | 'showDelete'> {
  // Simplified props for zone usage
  zoneType?: 'compact' | 'full' | 'inline';
  showUploadButton?: boolean;
  showDragDrop?: boolean;
  // Add onUpload prop for compatibility
  onUpload?: (file: File) => Promise<void>;
}

export function PhotoUploadZone({
  zoneType = 'full',
  className,
  ...props
}: PhotoUploadZoneProps) {
  const zoneConfig = {
    compact: {
      className: 'p-4',
      showPreview: false,
      showProgress: false,
      showDelete: false,
    },
    full: {
      className: 'p-6',
      showPreview: true,
      showProgress: true,
      showDelete: true,
    },
    inline: {
      className: 'p-2',
      showPreview: false,
      showProgress: false,
      showDelete: false,
    },
  };

  const config = zoneConfig[zoneType];

  return (
    <PhotoUpload
      {...props}
      {...config}
      className={className}
      showProgress={false} // Override for zone usage
      showDelete={false} // Override for zone usage
    />
  );
}

export default PhotoUploadZone;
