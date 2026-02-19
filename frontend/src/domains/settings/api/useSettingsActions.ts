'use client';

import { useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { settingsService } from '../server';
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
      return Boolean(response && (response as { success?: boolean }).success);
    },
    [withToken]
  );

  const updateNotifications = useCallback(
    async (data: UpdateNotificationsRequest) => {
      const response = await withToken((token) => settingsService.updateNotifications(token, data));
      return Boolean(response && (response as { success?: boolean }).success);
    },
    [withToken]
  );

  const updateAccessibility = useCallback(
    async (data: UpdateAccessibilityRequest) => {
      const response = await withToken((token) => settingsService.updateAccessibility(token, data));
      return Boolean(response && (response as { success?: boolean }).success);
    },
    [withToken]
  );

  const updatePerformance = useCallback(
    async (data: UpdatePerformanceRequest) => {
      const response = await withToken((token) => settingsService.updatePerformance(token, data));
      return Boolean(response && (response as { success?: boolean }).success);
    },
    [withToken]
  );

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest) => {
      const response = await withToken((token) => settingsService.updateProfile(token, data));
      return Boolean(response && (response as { success?: boolean }).success);
    },
    [withToken]
  );

  const changePassword = useCallback(
    async (data: ChangePasswordRequest) => {
      const response = await withToken((token) => settingsService.changePassword(token, data));
      return Boolean(response && (response as { success?: boolean }).success);
    },
    [withToken]
  );

  const resetSettings = useCallback(async () => {
    const response = await withToken((token) => settingsService.resetSettings(token));
    return Boolean(response && (response as { success?: boolean }).success);
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
