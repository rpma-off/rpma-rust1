import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Camera, Trash2, Upload, ImageIcon } from 'lucide-react';
import { addKeyboardNavigation } from '@/lib/accessibility.ts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { resolveLocalImageUrl, shouldUseUnoptimizedImage } from '@/shared/utils';
import { formatDate } from '@/shared/utils/date-formatters';
import { useInterventionPhotos } from '@/domains/interventions';

interface TaskPhotosProps {
  taskId: string;
  interventionId?: string;
}

export function TaskPhotos({ taskId: _taskId, interventionId }: TaskPhotosProps) {
  const { toast } = useToast();
  const galleryRef = useRef<HTMLDivElement>(null);

  const {
    photos,
    isLoading,
    uploadPhoto,
    deletePhoto,
    isUploading
  } = useInterventionPhotos(interventionId);

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'Before' | 'After') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadPhoto.mutateAsync({ file, type });
        toast({
          title: 'Succès',
          description: 'Photo téléversée avec succès',
        });
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast({
          title: 'Erreur',
          description: 'Échec du téléversement de la photo',
          variant: 'destructive',
        });
      }
    }
    e.target.value = '';
  };

  // Add keyboard navigation to photo gallery
  useEffect(() => {
    if (galleryRef.current && photos && photos.length > 0) {
      const cleanup = addKeyboardNavigation(galleryRef.current, {
        orientation: 'horizontal',
        loop: true,
      });
      return cleanup;
    }
    return () => {};
  }, [photos]);

  const beforePhotos = photos?.filter(p => p.photo_type === 'before') || [];
  const afterPhotos = photos?.filter(p => p.photo_type === 'after') || [];

  type InterventionPhoto = NonNullable<typeof photos>[number];

  const PhotoSection = ({
    title,
    photosList,
    type,
  }: {
    title: string;
    photosList: InterventionPhoto[];
    type: 'Before' | 'After';
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Camera className="w-4 h-4" />
          {title}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px]">
            {photosList.length} photo{photosList.length > 1 ? 's' : ''}
          </span>
        </h3>
        <Button asChild variant="ghost" size="sm" className="h-8 text-xs hover:bg-accent/5 hover:text-accent">
          <label className="cursor-pointer flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Ajouter
            <input
              type="file"
              className="sr-only"
              accept="image/*"
              onChange={(e) => handleFileChange(e, type)}
              disabled={isUploading}
            />
          </label>
        </Button>
      </div>

      {photosList.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-xl bg-background/20 group hover:bg-background/40 transition-colors">
          <ImageIcon className="h-8 w-8 text-border-light mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-xs text-muted-foreground font-medium">Aucune photo {title.toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photosList.map((photo, index) => {
            const displaySrc = resolveLocalImageUrl(photo.storage_url || photo.file_path);
            return (
              <Card
                key={photo.id}
                tabIndex={0}
                className="group relative overflow-hidden aspect-square border-0 bg-transparent ring-1 ring-border/50 hover:ring-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/70 transition-all shadow-none hover:shadow-lg"
              >
                <Image
                  src={displaySrc}
                  alt={`${title} - Photo ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized={shouldUseUnoptimizedImage(displaySrc)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => deletePhoto.mutate(photo.id)}
                    disabled={deletePhoto.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white/90 font-medium">
                    {photo.created_at ? formatDate(photo.created_at as unknown as string) : ''}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-8">
        {[1, 2].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="aspect-square rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10" ref={galleryRef}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
        <PhotoSection title="Photos Avant" photosList={beforePhotos} type="Before" />
        <PhotoSection title="Photos Après" photosList={afterPhotos} type="After" />
      </div>

      {isUploading && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <Card className="flex items-center gap-3 p-3 bg-white shadow-2xl border-accent/20">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-sm font-medium text-foreground">Téléversement en cours...</span>
          </Card>
        </div>
      )}
    </div>
  );
}
