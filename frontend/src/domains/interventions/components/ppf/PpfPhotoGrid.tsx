'use client';

import React, { useRef, useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhotoUpload } from '@/domains/documents';
import { toast } from 'sonner';

type PpfPhotoGridProps = {
  taskId: string;
  interventionId?: string | null;
  stepId: string;
  type?: 'before' | 'after' | 'during';
  photos: string[];
  requiredLabels?: string[];
  minPhotos?: number;
  maxPhotos?: number;
  onChange: (photos: string[]) => void;
  title?: string;
  hint?: string;
};

export function PpfPhotoGrid({
  taskId,
  interventionId,
  stepId,
  type = 'before',
  photos,
  requiredLabels = [],
  minPhotos = 0,
  maxPhotos = 8,
  onChange,
  title,
  hint,
}: PpfPhotoGridProps) {
  const uploadEntityId = interventionId ?? taskId;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadPhotos, isOnline } = usePhotoUpload(uploadEntityId, type);

  const handleSelectFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadPhotos(Array.from(files), { taskId: uploadEntityId, type, stepId });
      if (uploaded.length > 0) {
        const nextPhotos = [...photos, ...uploaded].slice(0, maxPhotos);
        onChange(nextPhotos);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du téléversement des photos');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const requiredCount = Math.max(minPhotos, requiredLabels.length);
  const filled = photos.length;
  const remainingSlots = Math.max(requiredCount - filled, 0);
  const gridSlots = Math.max(requiredCount, Math.min(maxPhotos, 4));

  return (
    <div>
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {minPhotos > 0 && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
              Min. {minPhotos} requises
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
          isUploading ? 'border-emerald-400 bg-emerald-50' : 'border-[hsl(var(--rpma-border))] hover:border-emerald-400/60 hover:bg-emerald-50/50'
        )}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="h-6 w-6 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Appuyer pour prendre une photo
        </span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
        {!isOnline && (
          <span className="text-[10px] font-semibold text-orange-600">
            Mode hors ligne: capture non synchronisée non supportée pour l&apos;instant
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => handleSelectFiles(event.target.files)}
      />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {Array.from({ length: gridSlots }).map((_, index) => {
          const photoUrl = photos[index];
          const label = requiredLabels[index];
          if (photoUrl) {
            return (
              <div
                key={`photo-${index}`}
                className="relative aspect-square overflow-hidden rounded-lg border border-emerald-400/40 bg-emerald-50"
              >
                <img
                  src={photoUrl}
                  alt={label ?? `photo-${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {label && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {label}
                  </span>
                )}
              </div>
            );
          }
          return (
            <button
              key={`photo-slot-${index}`}
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[hsl(var(--rpma-border))] text-muted-foreground transition hover:border-emerald-400/60 hover:bg-emerald-50/50"
            >
              <Plus className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      {requiredCount > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          {filled} / {requiredCount} photos · {Math.max(remainingSlots, 0)} restantes
        </div>
      )}
    </div>
  );
}
