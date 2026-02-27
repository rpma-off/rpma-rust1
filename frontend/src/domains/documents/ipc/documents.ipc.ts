import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { Photo } from '@/lib/ipc/types/index';

export const documentsIpc = {
  listPhotos: async (interventionId: string, sessionToken: string): Promise<Photo[]> => {
    const response = await safeInvoke<{ photos: Photo[]; total: number }>(
      IPC_COMMANDS.DOCUMENT_GET_PHOTOS,
      {
        session_token: sessionToken,
        request: { intervention_id: interventionId },
      }
    );
    return response?.photos ?? [];
  },

  uploadPhoto: async (
    interventionId: string,
    filePath: string,
    photoType: string,
    sessionToken: string
  ): Promise<Photo> => {
    const response = await safeInvoke<{ photo: Photo; file_path: string }>(
      IPC_COMMANDS.DOCUMENT_STORE_PHOTO,
      {
        session_token: sessionToken,
        request: {
          intervention_id: interventionId,
          file_name: filePath,
          mime_type: 'image/jpeg',
          photo_type: photoType,
          is_required: false,
        },
        image_data: [],
      }
    );
    return response.photo;
  },

  deletePhoto: (photoId: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.DOCUMENT_DELETE_PHOTO, {
      session_token: sessionToken,
      photo_id: photoId,
    }),

  getPhoto: (photoId: string, sessionToken: string): Promise<Photo> =>
    safeInvoke<Photo>(IPC_COMMANDS.DOCUMENT_GET_PHOTO, {
      session_token: sessionToken,
      photo_id: photoId,
    }),
};

