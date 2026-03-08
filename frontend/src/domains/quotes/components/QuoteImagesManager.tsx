'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Image as ImageIcon, Loader2, X, Upload } from 'lucide-react';
import { compressImage, formatFileSize } from '@/domains/quotes/utils/image-compression';
import { useQuoteAttachments, useQuoteAttachmentActions } from '@/domains/quotes/hooks/useQuotes';

import type { QuoteAttachment } from '@/types/quote.types';

interface QuoteImagesManagerProps {
  quoteId: string;
  initialImages: QuoteAttachment[];
  maxImages?: number;
}

export function QuoteImagesManager({
  quoteId,
  initialImages,
  maxImages,
}: QuoteImagesManagerProps) {
  const { attachments, loading, refetch } = useQuoteAttachments(quoteId);
  const { createAttachment, updateAttachment, deleteAttachment } = useQuoteAttachmentActions();

  const [images, setImages] = useState<QuoteAttachment[]>(
    initialImages.filter(img => img.mime_type?.startsWith('image/'))
  );
  const atLimit = maxImages !== undefined && images.length >= maxImages;
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    let fileArr = Array.from(files);
    const rejected = fileArr.filter((f) => !allowedTypes.includes(f.type));

    if (rejected.length > 0) {
      toast.error(`Types non autorisés: ${rejected.map(f => f.name).join(', ')}`);
      fileArr = fileArr.filter((f) => allowedTypes.includes(f.type));
      if (fileArr.length === 0) return;
    }

    if (maxImages !== undefined) {
      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        toast.error(`Limite atteinte: ${images.length}/${maxImages}`);
        return;
      }
      if (fileArr.length > remaining) {
        fileArr = fileArr.slice(0, remaining);
        toast.warning(`Uniquement ${remaining} images seront téléchargées`);
      }
    }

    setUploading(true);
    const toastId = toast.loading(`Téléchargement de ${fileArr.length} images...`);
    let successCount = 0;

    for (const file of fileArr) {
      try {
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          quality: 0.8,
          format: 'webp',
        });

        const result = await createAttachment(quoteId, {
          file_name: compressedFile.name,
          file_path: URL.createObjectURL(compressedFile),
          mime_type: compressedFile.type,
          file_size: compressedFile.size,
          attachment_type: 'image',
        });

        if (result) {
          setImages((prev) => [...prev, result]);
          successCount++;
        } else {
          toast.error(`Échec pour ${file.name}`);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        toast.error(`Échec pour ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} images téléchargées`, { id: toastId });
      await refetch();
    } else {
      toast.error('Échec du téléchargement', { id: toastId });
    }
    setUploading(false);
  }, [quoteId, maxImages, images.length, createAttachment, refetch]);

  const handleDelete = useCallback(async (attachmentId: string) => {
    const result = await deleteAttachment(quoteId, attachmentId);
    if (result) {
      setImages((prev) => prev.filter((img) => img.id !== attachmentId));
      toast.success('Image supprimée');
      await refetch();
    } else {
      toast.error('Échec de la suppression');
    }
  }, [quoteId, deleteAttachment, refetch]);

  const handleDescriptionChange = useCallback(async (attachmentId: string, description: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === attachmentId ? { ...img, description } : img
      )
    );

    await updateAttachment(quoteId, attachmentId, { description });
  }, [quoteId, updateAttachment]);

  const handleToggleInvoice = useCallback(async (_attachmentId: string, _checked: boolean) => {
    // include_in_invoice is not supported by the backend
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4" />
          Images
          {maxImages !== undefined && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {images.length} / {maxImages}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {atLimit ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Limite atteinte: {images.length}/{maxImages}
            </p>
          </div>
        ) : (
          <div
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 hover:border-muted-foreground/50"
          >
            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {uploading ? 'Téléchargement...' : 'Glissez-déposez des images ou cliquez'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG, PNG, WebP (max {maxImages || 10})
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUpload(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Traitement des images...
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {images.map((file) => (
              <div key={file.id} className="group overflow-hidden rounded-lg border">
                <div className="relative">
                  <img
                    src={file.file_path}
                    alt={file.description || file.file_name}
                    className="aspect-square w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleDelete(file.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1 p-1.5">
                  <Input
                    placeholder="Description"
                    value={file.description || ''}
                    onChange={(e) => handleDescriptionChange(file.id, e.target.value)}
                    onBlur={(e) => handleDescriptionChange(file.id, e.target.value)}
                    className="h-6 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
