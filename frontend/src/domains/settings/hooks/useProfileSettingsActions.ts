import { useCallback } from 'react';
import type { JsonObject } from '@/types/json';
import { settingsIpc } from '../ipc/settings.ipc';

export function useProfileSettingsActions() {
  const updateProfile = useCallback(async (profile: JsonObject) => {
    await settingsIpc.updateUserProfile(profile);
  }, []);

  const uploadAvatar = useCallback(
    async (fileData: string, fileName: string, mimeType: string) =>
      settingsIpc.uploadUserAvatar(fileData, fileName, mimeType),
    [],
  );

  return {
    updateProfile,
    uploadAvatar,
  };
}
