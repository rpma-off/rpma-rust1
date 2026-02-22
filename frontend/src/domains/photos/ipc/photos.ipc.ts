import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { Photo } from '@/lib/ipc/types/index';

export const photosIpc = {
  list: (interventionId: string, sessionToken: string): Promise<Photo[]> =>
    safeInvoke<Photo[]>(IPC_COMMANDS.PHOTO_CRUD, {
      action: { List: { intervention_id: interventionId } },
      session_token: sessionToken
    }),

  upload: (
    interventionId: string,
    filePath: string,
    photoType: string,
    sessionToken: string
  ): Promise<Photo> =>
    safeInvoke<Photo>(IPC_COMMANDS.PHOTO_CRUD, {
      action: {
        Store: {
          intervention_id: interventionId,
          file_name: filePath,
          mime_type: 'image/jpeg',
          photo_type: photoType,
          is_required: false
        }
      },
      session_token: sessionToken
    }),

  delete: (photoId: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.PHOTO_CRUD, {
      action: { Delete: { id: photoId } },
      session_token: sessionToken
    }),
};
