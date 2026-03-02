'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Upload,
  X,
} from 'lucide-react';
import { useQuoteAttachments, useQuoteAttachmentActions } from '@/domains/quotes';
import type { QuoteAttachment } from '@/types/quote.types';
import { formatFileSize } from '@/domains/quotes/utils/image-compression';

interface QuoteDocumentsManagerProps {
  quoteId: string;
  initialDocuments: QuoteAttachment[];
  maxDocuments?: number;
}

export function QuoteDocumentsManager({
  quoteId,
  initialDocuments,
  maxDocuments,
}: QuoteDocumentsManagerProps) {
  const { attachments, loading, refetch } = useQuoteAttachments(quoteId);
  const { createAttachment, updateAttachment, deleteAttachment } = useQuoteAttachmentActions();

  const [files, setFiles] = useState<QuoteAttachment[]>(
    initialDocuments.filter(f => !f.mime_type?.startsWith('image/'))
  );
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = maxDocuments !== undefined && files.length >= maxDocuments;

  const handleUpload = useCallback(async (fileList: FileList | File[]) => {
    let fileArr = Array.from(fileList);

    if (maxDocuments !== undefined) {
      const remaining = maxDocuments - files.length;
      if (remaining <= 0) {
        toast.error(`Limite atteinte: ${files.length}/${maxDocuments}`);
        return;
      }
      if (fileArr.length > remaining) {
        fileArr = fileArr.slice(0, remaining);
        toast.warning(`Uniquement ${remaining} documents seront téléchargés`);
      }
    }

    setUploading(true);
    const toastId = toast.loading(`Téléchargement de ${fileArr.length} documents...`);
    let successCount = 0;

    for (const file of fileArr) {
      try {
        const result = await createAttachment(quoteId, {
          file_name: file.name,
          file_path: URL.createObjectURL(file),
          mime_type: file.type,
          file_size: file.size,
          attachment_type: 'document',
          include_in_invoice: true,
        });

        if (result) {
          setFiles((prev) => [...prev, result]);
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
      toast.success(`${successCount} documents téléchargés`, { id: toastId });
      await refetch();
    } else {
      toast.error('Échec du téléchargement', { id: toastId });
    }
    setUploading(false);
  }, [quoteId, maxDocuments, files.length, createAttachment, refetch]);

  const handleDelete = useCallback(async (attachmentId: string) => {
    const result = await deleteAttachment(quoteId, attachmentId);
    if (result) {
      setFiles((prev) => prev.filter((f) => f.id !== attachmentId));
      toast.success('Document supprimé');
      await refetch();
    } else {
      toast.error('Échec de la suppression');
    }
  }, [quoteId, deleteAttachment, refetch]);

  const handleDescriptionChange = useCallback(async (attachmentId: string, description: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === attachmentId ? { ...f, description } : f
      )
    );

    await updateAttachment(quoteId, attachmentId, { description });
  }, [quoteId, updateAttachment]);

  const handleToggleInvoice = useCallback(async (attachmentId: string, checked: boolean) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === attachmentId ? { ...f, include_in_invoice: checked } : f
      )
    );

    await updateAttachment(quoteId, attachmentId, { include_in_invoice: checked });
  }, [quoteId, updateAttachment]);

  function getFileIcon(mimeType: string) {
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <Paperclip className="h-4 w-4 text-muted-foreground" />;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4" />
          Documents
          {maxDocuments !== undefined && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {files.length} / {maxDocuments}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {atLimit ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Limite atteinte: {files.length}/{maxDocuments}
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
            <Upload className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {uploading ? 'Téléchargement...' : 'Glissez-déposez des documents ou cliquez'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, CSV, TXT, DOC
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.txt,.doc,.docx"
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
            Traitement des documents...
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-md border p-2.5"
              >
                {getFileIcon(file.mime_type)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    checked={file.include_in_invoice ?? true}
                    onCheckedChange={(checked) => handleToggleInvoice(file.id, checked ?? true)}
                    className="scale-75"
                  />
                  PDF
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(file.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
