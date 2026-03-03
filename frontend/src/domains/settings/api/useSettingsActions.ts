'use client';

import { useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { settingsService } from '../server';
import { invalidateSettingsCache } from './useSettings';
import type {
  UseSettingsActionsResult,
  UpdatePreferencesRequest,
  UpdateNotificationsRequest,
  UpdateAccessibilityRequest,
  UpdatePerformanceRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from './types';

export function useSettingsActions(): UseSettingsActionsResult {
  const { user } = useAuth();

  const withToken = useCallback(async <T>(fn: (token: string) => Promise<T>): Promise<T | null> => {
    if (!user?.token) {
      return null;
    }
    return fn(user.token);
  }, [user?.token]);

  const updatePreferences = useCallback(
    async (data: UpdatePreferencesRequest) => {
      const response = await withToken((token) => settingsService.updatePreferences(token, data));
      const ok = Boolean(response && (response as { success?: boolean }).success);
      if (ok) invalidateSettingsCache();
      return ok;
    },
    [withToken]
  );

  const updateNotifications = useCallback(
    async (data: UpdateNotificationsRequest) => {
      const response = await withToken((token) => settingsService.updateNotifications(token, data));
      const ok = Boolean(response && (response as { success?: boolean }).success);
      if (ok) invalidateSettingsCache();
      return ok;
    },
    [withToken]
  );

  const updateAccessibility = useCallback(
    async (data: UpdateAccessibilityRequest) => {
      const response = await withToken((token) => settingsService.updateAccessibility(token, data));
      const ok = Boolean(response && (response as { success?: boolean }).success);
      if (ok) invalidateSettingsCache();
      return ok;
    },
    [withToken]
  );

  const updatePerformance = useCallback(
    async (data: UpdatePerformanceRequest) => {
      const response = await withToken((token) => settingsService.updatePerformance(token, data));
      const ok = Boolean(response && (response as { success?: boolean }).success);
      if (ok) invalidateSettingsCache();
      return ok;
    },
    [withToken]
  );

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest) => {
      const response = await withToken((token) => settingsService.updateProfile(token, data));
      const ok = Boolean(response && (response as { success?: boolean }).success);
      if (ok) invalidateSettingsCache();
      return ok;
    },
    [withToken]
  );

  const changePassword = useCallback(
    async (data: ChangePasswordRequest) => {
      const response = await withToken((token) => settingsService.changePassword(token, data));
      const ok = Boolean(response && (response as { success?: boolean }).success);
      if (ok) invalidateSettingsCache();
      return ok;
    },
    [withToken]
  );

  const resetSettings = useCallback(async () => {
    const response = await withToken((token) => settingsService.resetSettings(token));
    const ok = Boolean(response && (response as { success?: boolean }).success);
    if (ok) invalidateSettingsCache();
    return ok;
  }, [withToken]);

  return {
    updatePreferences,
    updateNotifications,
    updateAccessibility,
    updatePerformance,
    updateProfile,
    changePassword,
    resetSettings,
  };
}
