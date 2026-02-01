import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { Photo } from '../types/index';

/**
 * Photo management operations for interventions
 */
export const photoOperations = {
  /**
   * Lists all photos for an intervention
   * @param interventionId - Intervention ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to array of photos
   */
  list: (interventionId: string, sessionToken: string): Promise<Photo[]> =>
    safeInvoke<Photo[]>(IPC_COMMANDS.PHOTO_CRUD, {
      action: { List: { intervention_id: interventionId } },
      session_token: sessionToken
    }),

  /**
   * Uploads a photo for an intervention
   * @param interventionId - Intervention ID
   * @param filePath - Path to the photo file
   * @param photoType - Type of photo
   * @param sessionToken - User's session token
   * @returns Promise resolving to uploaded photo data
   */
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

  /**
   * Deletes a photo by ID
   * @param photoId - Photo ID to delete
   * @param sessionToken - User's session token
   * @returns Promise resolving when photo is deleted
   */
  delete: (photoId: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.PHOTO_CRUD, {
      action: { Delete: { id: photoId } },
      session_token: sessionToken
    }),
};