'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Photo } from '@/lib/ipc/types/index';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
  selectedPhotoId?: string;
}

export function PhotoGrid({ photos, onPhotoClick, selectedPhotoId }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground py-8">
            Aucune photo disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <Card
          key={photo.id}
          className={`rpma-shell overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-[hsl(var(--rpma-primary))] ${
            selectedPhotoId === photo.id ? 'ring-2 ring-[hsl(var(--rpma-primary))]' : ''
          }`}
          onClick={() => onPhotoClick?.(photo)}
        >
          <div className="relative aspect-square bg-[hsl(var(--rpma-surface-light))]">
            <img
              src={`file://${photo.file_path}`}
              alt={photo.photo_type || 'Photo'}
              className="w-full h-full object-cover"
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
