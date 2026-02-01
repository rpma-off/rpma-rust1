import React, { useState } from 'react';
import { KeyboardNavigation } from '@/lib/accessibility';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';

import { Camera, Trash2, Upload, AlertCircle, ImageIcon } from 'lucide-react';



type TaskPhoto = {
  id: string;
  url: string;
  type: 'Before' | 'After';
  uploaded_at: string;
  uploaded_by: {
    id: string;
    full_name: string;
  } | null;
};

interface TaskPhotosProps {
  taskId: string;
}

export function TaskPhotos({ taskId }: TaskPhotosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Before' | 'After'>('Before');

  // Fetch photos for the task
  const { data: photos, isLoading, error } = useQuery<TaskPhoto[]>({
    queryKey: ['tasks', taskId, 'photos'],
    queryFn: async () => {
      const response = await fetch(`/api/v1/tasks/${taskId}/photos`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await response.json();
      return data.data;
    }
  });

  // Handle file upload
  const uploadPhoto = async (file: File, type: 'Before' | 'After') => {
    setIsUploading(true);
    
    try {
      // Get upload URL from the server
      const uploadResponse = await fetch(`/api/v1/tasks/${taskId}/photos/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          photoType: type
        })
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }
      
      const { url, fields, photoId } = await uploadResponse.json();
      
      // Create form data for the upload
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file);
      
      // Upload the file to storage
      const uploadResult = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResult.ok) {
        throw new Error('Upload failed');
      }
      
      // Confirm the upload with our API
      const confirmResponse = await fetch(`/api/v1/tasks/${taskId}/photos/confirm-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId })
      });
      
      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm upload');
      }
      
      toast({
        title: 'Success',
        description: 'Photo uploaded successfully',
      });
      
      // Refresh the photos list
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'photos'] });
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload photo',
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
      const response = await fetch(`/api/v1/tasks/${taskId}/photos/${photoId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'photos'] });
      toast({
        title: 'Success',
        description: 'Photo deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete photo',
        variant: 'destructive',
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading photos
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredPhotos = photos?.filter(photo => photo.type === activeTab) || [];

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
              if (KeyboardNavigation.isActivationKey(e.key)) {
                setActiveTab('Before');
                e.preventDefault();
              }
            }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Before
          </Button>
          <Button
            variant={activeTab === 'After' ? 'default' : 'outline'}
            onClick={() => setActiveTab('After')}
            aria-pressed={activeTab === 'After'}
            aria-controls="photos-gallery"
            onKeyDown={(e) => {
              if (KeyboardNavigation.isActivationKey(e.key)) {
                setActiveTab('After');
                e.preventDefault();
              }
            }}
          >
            <Camera className="h-4 w-4 mr-2" />
            After
          </Button>
        </div>
        
        <div className="relative">
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload {activeTab} Photo
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={(e) => handleFileChange(e, activeTab)}
                disabled={isUploading}
                aria-label={`Upload ${activeTab} Photo`}
              />
            </label>
          </Button>
          {isUploading && (
            <div className="absolute -top-2 -right-2" aria-live="polite">
              <Skeleton className="h-5 w-5 animate-spin text-primary" />
              <span className="sr-only">Uploading photo...</span>
            </div>
          )}
        </div>
      </div>

      <div id="photos-gallery" aria-live="polite">
      {filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            No {activeTab.toLowerCase()} photos uploaded yet
          </p>
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload {activeTab} Photo
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
          {filteredPhotos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative aspect-square">
                <Image
                  src={photo.url}
                  alt={`${photo.type} photo uploaded on ${new Date(photo.uploaded_at).toLocaleDateString()}${photo.uploaded_by ? ` by ${photo.uploaded_by.full_name}` : ''}`}
                  fill
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePhotoMutation.mutate(photo.id)}
                    disabled={deletePhotoMutation.isPending}
                    aria-label={`Delete ${photo.type} photo`}
                    onKeyDown={(e) => {
                      if (KeyboardNavigation.isActivationKey(e.key) && !deletePhotoMutation.isPending) {
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
                  <span>{photo.type} Photo</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(photo.uploaded_at).toLocaleDateString()}
                  </span>
                </CardTitle>
                {photo.uploaded_by && (
                  <p className="text-xs text-muted-foreground">
                    Uploaded by {photo.uploaded_by.full_name}
                  </p>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
