'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Eye, 
  Download, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Photo, PhotoType } from '@/lib/backend';
import { PhotoGalleryProps } from '@/types/photo.types';

export function PhotoGallery({
  photos,
  title,
  description,
  className,
  
  // Display options
  layout = 'grid',
  gridCols = 4,
  showMetadata = true,
  showActions = true,
  
  // Actions
  onPhotoClick,
  onPhotoDelete,
  onPhotoDownload,
  
  // Filtering
  filterByType = 'all',
  sortBy = 'date',
  sortOrder = 'desc',
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Filter and sort photos
  const filteredAndSortedPhotos = React.useMemo(() => {
    let filtered = photos;
    
    // Filter by type
    if (filterByType !== 'all') {
      filtered = filtered.filter(photo => photo.photo_type === filterByType);
    }
    
    // Sort photos
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = a.uploaded_at ? new Date(Number(a.uploaded_at)).getTime() : 0;
          const dateB = b.uploaded_at ? new Date(Number(b.uploaded_at)).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'name':
          comparison = (a.file_name || '').localeCompare(b.file_name || '');
          break;
        case 'type':
          comparison = (a.photo_type || '').localeCompare(b.photo_type || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [photos, filterByType, sortBy, sortOrder]);

  // Photo type counts
  const photoCounts = React.useMemo(() => {
    const counts = { before: 0, after: 0, during: 0, total: photos.length };
    photos.forEach(photo => {
      if (photo.photo_type) {
        counts[photo.photo_type as keyof typeof counts]++;
      }
    });
    return counts;
  }, [photos]);

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    setCurrentPhotoIndex(filteredAndSortedPhotos.findIndex(p => p.id === photo.id));
    onPhotoClick?.(photo);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
  };

  const handlePreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      const newIndex = currentPhotoIndex - 1;
      setCurrentPhotoIndex(newIndex);
      setSelectedPhoto(filteredAndSortedPhotos[newIndex]);
    }
  };

  const handleNextPhoto = () => {
    if (currentPhotoIndex < filteredAndSortedPhotos.length - 1) {
      const newIndex = currentPhotoIndex + 1;
      setCurrentPhotoIndex(newIndex);
      setSelectedPhoto(filteredAndSortedPhotos[newIndex]);
    }
  };

  const handleDownload = (photo: Photo) => {
    if (onPhotoDownload) {
      onPhotoDownload(photo);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = photo.storage_url || photo.file_path;
      link.download = photo.file_name || `photo-${photo.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (photoId: string) => {
    if (onPhotoDelete) {
      onPhotoDelete(photoId);
    }
  };

  if (filteredAndSortedPhotos.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="text-gray-400 mb-4">
            <Eye className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500">Aucune photo disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">{title}</h3>
              <div className="flex space-x-2">
                <Badge variant="outline">
                  {filteredAndSortedPhotos.length} photo(s)
                </Badge>
                {filterByType === 'all' && (
                  <>
                    <Badge variant="secondary">{photoCounts.before} avant</Badge>
                    <Badge variant="secondary">{photoCounts.after} après</Badge>
                    <Badge variant="secondary">{photoCounts.during} pendant</Badge>
                  </>
                )}
              </div>
            </div>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}

      {/* Photo Grid */}
      {layout === 'grid' && (
        <div 
          className={cn(
            'grid gap-4',
            gridCols === 2 && 'grid-cols-2',
            gridCols === 3 && 'grid-cols-2 md:grid-cols-3',
            gridCols === 4 && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
            gridCols === 6 && 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
          )}
        >
          {filteredAndSortedPhotos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className="relative w-full h-32 rounded-lg overflow-hidden">
                <Image
                  src={photo.storage_url || photo.file_path}
                  alt={photo.file_name || 'Photo'}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover rounded-lg"
                  unoptimized={(photo.storage_url || photo.file_path).startsWith('data:')}
                />
                
                {/* Overlay Actions */}
                {showActions && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePhotoClick(photo)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onPhotoDownload && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownload(photo)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {onPhotoDelete && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(photo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Photo Type Badge */}
                {photo.photo_type && (
                  <div className="absolute top-2 left-2">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'text-xs',
                        photo.photo_type === 'before' && 'bg-red-100 text-red-800',
                        photo.photo_type === 'after' && 'bg-green-100 text-green-800',
                        photo.photo_type === 'during' && 'bg-yellow-100 text-yellow-800'
                      )}>
                      {photo.photo_type}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Photo Metadata */}
              {showMetadata && (photo.uploaded_at || photo.approved_by) && (
                <div className="mt-2 text-xs text-gray-500">
                  {photo.uploaded_at && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(photo.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {photo.approved_by && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(Number(photo.uploaded_at)).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo List */}
      {layout === 'list' && (
        <div className="space-y-4">
          {filteredAndSortedPhotos.map((photo) => (
            <div key={photo.id} className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={photo.storage_url || photo.file_path}
                  alt={photo.file_name || 'Photo'}
                  fill
                  className="object-cover"
                  unoptimized={(photo.storage_url || photo.file_path).startsWith('data:')}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{photo.file_name || 'Photo'}</p>
                {showMetadata && (
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {photo.uploaded_at && (
                      <span>{new Date(Number(photo.uploaded_at)).toLocaleDateString()}</span>
                    )}
                    {photo.approved_by && (
                      <span>{photo.approved_by}</span>
                    )}
                {photo.photo_type && (
                      <Badge variant="outline" className="text-xs">
                        {photo.photo_type}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {showActions && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {onPhotoDownload && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(photo)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {onPhotoDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(photo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-black/80 hover:text-white z-10"
              onClick={handleCloseModal}
            >
              <X className="h-6 w-6" />
            </Button>
            
            {/* Navigation Buttons */}
            {filteredAndSortedPhotos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-black/80 hover:text-white z-10"
                  onClick={handlePreviousPhoto}
                  disabled={currentPhotoIndex === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-black/80 hover:text-white z-10"
                  onClick={handleNextPhoto}
                  disabled={currentPhotoIndex === filteredAndSortedPhotos.length - 1}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            
            {/* Photo */}
            <Image
              src={selectedPhoto.storage_url || ''}
              alt={selectedPhoto.file_name || 'Photo'}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Photo Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedPhoto.file_name || 'Photo'}</p>
                  {showMetadata && (
                     <div className="flex items-center space-x-4 text-sm">
                       {selectedPhoto.uploaded_at && (
                         <span>{new Date(Number(selectedPhoto.uploaded_at)).toLocaleString()}</span>
                       )}
                        {selectedPhoto.approved_by && (
                          <span>Approved by: {selectedPhoto.approved_by}</span>
                        )}
                      {selectedPhoto.photo_type && (
                        <Badge variant="secondary">{selectedPhoto.photo_type}</Badge>
                      )}
                    </div>
                  )}
                </div>
                
                {showActions && (
                  <div className="flex space-x-2">
                    {onPhotoDownload && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(selectedPhoto)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {onPhotoDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(selectedPhoto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoGallery;
