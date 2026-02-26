'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';
import { Photo } from '@/lib/ipc/types/index';
import { usePhotos } from '../hooks';
import { resolveLocalImageUrl } from '@/shared/utils';

interface PhotoViewerProps {
  photos: Photo[];
  initialIndex?: number;
  interventionId?: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
}

export function PhotoViewer({ photos, initialIndex = 0, interventionId, isOpen, onClose, onDelete }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { deletePhoto } = usePhotos({ interventionId });

  const currentPhoto = photos[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleDelete = async () => {
    if (!currentPhoto) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      const success = await deletePhoto(currentPhoto.id);
      if (success && onDelete) {
        onDelete(currentPhoto.id);
        if (photos.length > 1) {
          handleNext();
        } else {
          onClose();
        }
      }
    }
  };

  if (!currentPhoto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
            <img
              src={resolveLocalImageUrl(currentPhoto.file_path)}
              alt={currentPhoto.photo_type || 'Photo'}
              className="max-w-full max-h-full object-contain"
            />

            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="font-medium">{currentPhoto.photo_type || 'Photo'}</p>
                <p className="text-sm text-white/80">{currentPhoto.file_name}</p>
              </div>
              <div className="flex gap-2">
                {photos.length > 1 && (
                  <span className="text-sm text-white/80">
                    {currentIndex + 1} / {photos.length}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-white hover:bg-white/20"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
