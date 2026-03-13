import { safeInvoke } from '@/lib/ipc/core';
import type { Photo } from '@/lib/backend';

export const photosIpc = {
  list: async (interventionId: string): Promise<Photo[]> => {
    const response = await safeInvoke<{photos: Photo[], total: number}>('document_get_photos', {
      request: { intervention_id: interventionId }
    });
    return response.photos ?? [];
  },

  upload: async (
    interventionId: string,
    file: { name: string; mimeType: string; bytes: Uint8Array },
    photoType: string
  ): Promise<Photo> => {
    const response = await safeInvoke<{photo: Photo, file_path: string}>('document_store_photo', {
      request: {
        intervention_id: interventionId,
        file_name: file.name,
        mime_type: file.mimeType,
        photo_type: photoType,
        is_required: false
      },
      image_data: Array.from(file.bytes)
    });
    return response.photo;
  },

  delete: (photoId: string) =>
    safeInvoke<void>('document_delete_photo', {
      photo_id: photoId
    }),
};
