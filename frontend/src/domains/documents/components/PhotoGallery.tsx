'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Trash2, ZoomIn } from 'lucide-react';
import { usePhotos } from '../hooks';
import type { Photo } from '@/lib/ipc/types/index';
import { resolveLocalImageUrl } from '@/shared/utils';

interface PhotoGalleryProps {
  interventionId: string;
  onPhotoClick?: (photo: Photo) => void;
  onDelete?: (photoId: string) => void;
}

export function PhotoGallery({ interventionId, onPhotoClick, onDelete }: PhotoGalleryProps) {
  const { photos, loading, deletePhoto } = usePhotos({ interventionId });

  const handleDelete = async (photoId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      const success = await deletePhoto(photoId);
      if (success && onDelete) {
        onDelete(photoId);
      }
    }
  };

  if (loading) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-primary))]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
        <Card key={photo.id} className="rpma-shell overflow-hidden">
          <div className="relative aspect-square bg-[hsl(var(--rpma-surface-light))]">
            <img
              src={resolveLocalImageUrl(photo.file_path)}
              alt={photo.photo_type || 'Photo'}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onPhotoClick?.(photo)}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 hover:bg-white"
                onClick={() => onPhotoClick?.(photo)}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={() => handleDelete(photo.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Badge className="absolute bottom-2 left-2" variant="secondary">
              {photo.photo_type}
            </Badge>
          </div>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground truncate">
              {photo.file_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(photo.created_at).toLocaleDateString('fr-FR')}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
