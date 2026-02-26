import React, { useState, useEffect, useRef } from 'react';
import { addKeyboardNavigation } from '@/lib/accessibility.ts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';
import { ipcClient } from '@/lib/ipc';
import { useAuth } from '@/domains/auth';
import { resolveLocalImageUrl, shouldUseUnoptimizedImage } from '@/shared/utils';

import { Camera, Trash2, Upload, ImageIcon } from 'lucide-react';
import { Photo } from '@/lib/backend';

interface TaskPhotosProps {
  taskId: string;
  interventionId?: string;
}

export function TaskPhotos({ taskId, interventionId }: TaskPhotosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Before' | 'After'>('Before');
  const galleryRef = useRef<HTMLDivElement>(null);

  const tabLabel = (tab: 'Before' | 'After') => tab === 'Before' ? 'Avant' : 'Après';

  // Fetch photos for the intervention
  const { data: photos, isLoading: _isLoading, error: _error } = useQuery<Photo[]>({
    queryKey: ['interventions', interventionId || taskId, 'photos'],
    queryFn: async () => {
      if (!user?.token) {
        throw new Error('User not authenticated');
      }
      // Use interventionId if available, otherwise we can't fetch photos
      if (!interventionId) {
        return [];
      }
      return await ipcClient.photos.list(interventionId, user.token);
    },
    enabled: !!user?.token && !!interventionId
  });

  // Handle file upload
  const uploadPhoto = async (file: File, type: 'Before' | 'After') => {
    if (!user?.token) {
      toast({
        title: 'Erreur',
        description: 'Utilisateur non authentifié',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload the photo using Tauri command
      if (!interventionId) {
        toast({
          title: 'Erreur',
          description: 'Aucune intervention active trouvée',
          variant: 'destructive',
        });
        return;
      }
      const buffer = await file.arrayBuffer();
      await ipcClient.photos.upload(
        interventionId,
        {
          name: (file as { path?: string }).path || file.name,
          mimeType: file.type || 'application/octet-stream',
          bytes: new Uint8Array(buffer),
        },
        type.toLowerCase(),
        user.token
      );

      toast({
        title: 'Succès',
        description: 'Photo téléversée avec succès',
      });

      // Refresh the photos list
      queryClient.invalidateQueries({ queryKey: ['interventions', interventionId || taskId, 'photos'] });

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Erreur',
        description: 'Échec du téléversement de la photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'Before' | 'After') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto(file, type);
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  // Delete a photo
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      if (!user?.token) {
        throw new Error('User not authenticated');
      }
      return await ipcClient.photos.delete(photoId, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions', interventionId || taskId, 'photos'] });
      toast({
        title: 'Succès',
        description: 'Photo supprimée avec succès',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Échec de la suppression de la photo',
        variant: 'destructive',
      });
    }
  });

  // Add keyboard navigation to photo gallery
  useEffect(() => {
    const filteredPhotos = photos?.filter(photo => photo.photo_type === (activeTab === 'Before' ? 'before' : 'after')) || [];
    if (galleryRef.current && filteredPhotos && filteredPhotos.length > 0) {
      const cleanup = addKeyboardNavigation(galleryRef.current, {
        orientation: 'horizontal',
        loop: true,
        onEnter: (element) => {
          // Could open a modal or focus on photo details
          const photoCard = element.closest('[data-photo-id]');
          if (photoCard) {
            // For now, just announce the photo for screen readers
            const photoId = photoCard.getAttribute('data-photo-id');
            const announcement = `Photo ${photoId} selected. Press Delete to remove or Tab to navigate.`;
            const announcementElement = document.createElement('div');
            announcementElement.setAttribute('aria-live', 'polite');
            announcementElement.setAttribute('aria-atomic', 'true');
            announcementElement.className = 'sr-only';
            announcementElement.textContent = announcement;
            document.body.appendChild(announcementElement);
            setTimeout(() => document.body.removeChild(announcementElement), 1000);
          }
        },
        onSpace: (element) => {
          // Same as Enter
          const photoCard = element.closest('[data-photo-id]');
          if (photoCard) {
            const photoId = photoCard.getAttribute('data-photo-id');
            const announcement = `Photo ${photoId} activated.`;
            const announcementElement = document.createElement('div');
            announcementElement.setAttribute('aria-live', 'polite');
            announcementElement.setAttribute('aria-atomic', 'true');
            announcementElement.className = 'sr-only';
            announcementElement.textContent = announcement;
            document.body.appendChild(announcementElement);
            setTimeout(() => document.body.removeChild(announcementElement), 1000);
          }
        }
      });

      return cleanup;
    }
    return () => {};
  }, [photos, activeTab]);

  // Filter photos based on active tab
  const filteredPhotos = photos?.filter(photo => photo.photo_type === (activeTab === 'Before' ? 'before' : 'after')) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'Before' ? 'default' : 'outline'}
            onClick={() => setActiveTab('Before')}
            aria-pressed={activeTab === 'Before'}
            aria-controls="photos-gallery"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setActiveTab('Before');
                e.preventDefault();
              }
            }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Avant
          </Button>
          <Button
            variant={activeTab === 'After' ? 'default' : 'outline'}
            onClick={() => setActiveTab('After')}
            aria-pressed={activeTab === 'After'}
            aria-controls="photos-gallery"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setActiveTab('After');
                e.preventDefault();
              }
            }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Après
          </Button>
        </div>

        <div className="relative">
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Téléverser photo {tabLabel(activeTab)}
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={(e) => handleFileChange(e, activeTab)}
                disabled={isUploading}
                aria-label={`Téléverser photo ${tabLabel(activeTab)}`}
              />
            </label>
          </Button>
          {isUploading && (
            <div className="absolute -top-2 -right-2" aria-live="polite">
              <Skeleton className="h-5 w-5 animate-spin text-primary" />
              <span className="sr-only">Téléversement de la photo...</span>
            </div>
          )}
        </div>
      </div>

       <div
         id="photos-gallery"
         ref={galleryRef}
         aria-live="polite"
         aria-label="Galerie de photos"
         role="grid"
         aria-rowcount={Math.ceil(filteredPhotos.length / 3)}
         aria-colcount={3}
       >
      {filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Aucune photo {tabLabel(activeTab).toLowerCase()} téléversée pour le moment
          </p>
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Téléverser photo {tabLabel(activeTab)}
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={(e) => handleFileChange(e, activeTab)}
                disabled={isUploading}
              />
            </label>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPhotos.map((photo, index) => (
            (() => {
              const displaySrc = resolveLocalImageUrl(photo.storage_url || photo.file_path);
              return (
            <Card
              key={photo.id}
              data-photo-id={photo.id}
              className="overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              tabIndex={0}
              role="gridcell"
              aria-rowindex={Math.floor(index / 3) + 1}
              aria-colindex={(index % 3) + 1}
               aria-label={`Photo ${index + 1} of ${filteredPhotos.length}: ${photo.photo_type || 'Unknown'} photo uploaded on ${new Date(photo.created_at as unknown as string).toLocaleDateString()}`}
              onKeyDown={(e) => {
                if (e.key === 'Delete' && !deletePhotoMutation.isPending) {
                  deletePhotoMutation.mutate(photo.id);
                  e.preventDefault();
                }
              }}
            >
              <div className="relative aspect-square">
                <Image
                  src={displaySrc}
                   alt={`${photo.photo_type || 'Unknown'} photo uploaded on ${new Date(photo.created_at as unknown as string).toLocaleDateString()}`}
                  fill
                  className="w-full h-full object-cover"
                  unoptimized={shouldUseUnoptimizedImage(displaySrc)}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePhotoMutation.mutate(photo.id)}
                    disabled={deletePhotoMutation.isPending}
                    aria-label={`Delete ${photo.photo_type} photo`}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !deletePhotoMutation.isPending) {
                        deletePhotoMutation.mutate(photo.id);
                        e.preventDefault();
                      }
                    }}
                  >
                    {deletePhotoMutation.isPending ? (
                      <Skeleton className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{photo.photo_type || 'Inconnu'} Photo</span>
                  <span className="text-xs text-muted-foreground">
                     {photo.created_at ? new Date(photo.created_at as unknown as string).toLocaleDateString() : 'Inconnu'}
                  </span>
                </CardTitle>

              </CardHeader>
            </Card>
              );
            })()
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
