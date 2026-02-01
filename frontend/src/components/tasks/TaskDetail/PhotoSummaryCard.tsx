import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Eye, ImageIcon } from 'lucide-react';
import { TaskPhoto } from '@/lib/backend';

interface PhotoSummaryCardProps {
  taskId: string;
  photos?: TaskPhoto[] | null | { before: any[], after: any[], during: any[] };
  onViewPhotos?: () => void;
}

export const PhotoSummaryCard: React.FC<PhotoSummaryCardProps> = ({
  taskId,
  photos,
  onViewPhotos,
}) => {
  // Handle different photo data structures
  let totalPhotos = 0;
  let beforePhotos: any[] = [];
  let afterPhotos: any[] = [];
  let progressPhotos: any[] = [];

  if (Array.isArray(photos)) {
    // TaskPhoto[] format
    totalPhotos = photos.length;
    beforePhotos = photos.filter(p => p.photo_type === 'before');
    afterPhotos = photos.filter(p => p.photo_type === 'after');
    progressPhotos = photos.filter(p => p.photo_type === 'progress');
  } else if (photos && typeof photos === 'object') {
    // { before: Photo[], after: Photo[], during: Photo[] } format
    beforePhotos = photos.before || [];
    afterPhotos = photos.after || [];
    progressPhotos = photos.during || [];
    totalPhotos = beforePhotos.length + afterPhotos.length + progressPhotos.length;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Photos du chantier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">
              {beforePhotos.length}
            </div>
            <div className="text-xs text-blue-600">Avant</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">
              {afterPhotos.length}
            </div>
            <div className="text-xs text-green-600">Après</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <div className="text-lg font-semibold text-purple-600">
              {progressPhotos.length}
            </div>
            <div className="text-xs text-purple-600">Progression</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Total: {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
          </div>
          {totalPhotos > 0 && (
            <Badge variant="secondary" className="text-xs">
              <ImageIcon className="h-3 w-3 mr-1" />
              Disponible
            </Badge>
          )}
        </div>

        {onViewPhotos && totalPhotos > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewPhotos}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Voir les photos
          </Button>
        )}

        {totalPhotos === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            Aucune photo disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoSummaryCard;