'use client';

import React, { useRef, useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { convertFileSrc } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { usePhotoUpload } from '@/shared/features/documents/usePhotoUpload';

/**
 * Converts a local filesystem path to a Tauri asset:// URL.
 * Tauri's webview blocks direct file:// URLs; this maps them to the
 * permitted asset://localhost/... scheme instead.
 * Web URLs (http/https/data/blob) are returned unchanged.
 */
function toAssetUrl(url: string): string {
  if (!url) return url;
  // Already a web/data/blob URL — leave unchanged
  if (/^(https?|data|blob):/.test(url)) return url;
  // file:// URI — strip the scheme so convertFileSrc gets a plain path
  if (url.startsWith('file://')) {
    const path = decodeURIComponent(url.replace(/^file:\/\/\//, '').replace(/^file:\/\//, ''));
    return convertFileSrc(path);
  }
  // Windows absolute path (e.g. C:\... or C:/...) or Unix absolute path
  return convertFileSrc(url);
}


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

function getFriendlyUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Impossible de téléverser les photos pour le moment. Veuillez réessayer.';
  }

  const message = error.message.toLowerCase();
  if (message.includes('permission') || message.includes('denied') || message.includes('forbidden')) {
    return "Accès aux photos refusé. Vérifiez les permissions de l'application puis réessayez.";
  }
  if (message.includes('size') || message.includes('too large')) {
    return 'La photo est trop volumineuse. Choisissez une image plus légère puis réessayez.';
  }
  if (message.includes('format') || message.includes('mime') || message.includes('type')) {
    return "Format d'image non pris en charge. Utilisez une photo JPG ou PNG.";
  }
  return 'Impossible de téléverser les photos pour le moment. Veuillez réessayer.';
}

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
      toast.error(getFriendlyUploadErrorMessage(error));
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
            // Convert local filesystem paths to Tauri asset:// URLs so the webview can load them.
            // Tauri blocks direct file:// URLs; convertFileSrc maps them to asset://localhost/...
            const displaySrc = toAssetUrl(photoUrl);
            return (
              <div
                key={`photo-${index}`}
                className="relative aspect-square overflow-hidden rounded-lg border border-emerald-400/40 bg-emerald-50"
              >
                <img
                  src={displaySrc}
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
