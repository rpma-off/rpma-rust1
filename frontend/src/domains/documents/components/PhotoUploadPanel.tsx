'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { usePhotoUpload } from '../hooks';

interface PhotoUploadPanelProps {
  interventionId: string;
  photoType?: string;
  onComplete?: () => void;
}

export function PhotoUploadPanel({ interventionId, photoType = 'general', onComplete }: PhotoUploadPanelProps) {
  const { uploadPhoto, uploads, clearCompleted } = usePhotoUpload();
  const currentUpload = uploads[uploads.length - 1];
  const progress = currentUpload?.progress || 0;
  const uploading = uploads.some(u => u.status === 'uploading');
  const error = uploads.find(u => u.status === 'error')?.error || null;
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    await uploadPhoto(interventionId, file, { type: photoType as any });
    if (onComplete) {
      onComplete();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Importer une photo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-[hsl(var(--rpma-primary))] bg-[hsl(var(--rpma-primary-light))]'
              : 'border-[hsl(var(--rpma-border))] hover:border-[hsl(var(--rpma-primary))]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="flex flex-col items-center gap-4 cursor-pointer"
          >
            <div
              className={`p-4 rounded-full ${
                dragOver ? 'bg-[hsl(var(--rpma-primary))]' : 'bg-[hsl(var(--rpma-surface))]'
              }`}
            >
              <Upload className={`w-8 h-8 ${dragOver ? 'text-white' : 'text-[hsl(var(--rpma-primary))]'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {dragOver ? 'Relâchez pour importer' : 'Glissez-déposez une image ici'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
            </div>
          </label>

          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-[hsl(var(--rpma-surface-light))] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[hsl(var(--rpma-primary))] h-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Importation en cours... {progress}%
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 text-red-500 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
