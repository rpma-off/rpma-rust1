'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';
import {
  UserSession,
  UserPreferences,
  UserNotificationSettings,
  UserAccessibilitySettings,
} from '@/lib/backend';
import { SettingsErrorHandler } from '@/lib/utils/settings-error-handler';

// Combined form data type for all preference sections
export type PreferencesFormData = {
  preferences: UserPreferences;
  notifications: UserNotificationSettings;
  accessibility: UserAccessibilitySettings;
};

export function usePreferencesForm(user?: UserSession) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.USER,
    component: 'PreferencesTab',
  });

  const form = useForm<PreferencesFormData>({
    defaultValues: {
      preferences: {
        email_notifications: true,
        push_notifications: true,
        task_assignments: true,
        task_updates: true,
        system_alerts: true,
        weekly_reports: false,
        theme: 'system',
        language: 'fr',
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        high_contrast: false,
        large_text: false,
        reduce_motion: false,
        screen_reader: false,
        auto_refresh: true,
        refresh_interval: 60,
      },
      notifications: {
        email_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
        task_assigned: true,
        task_updated: true,
        task_completed: false,
        task_overdue: true,
        system_alerts: true,
        maintenance: false,
        security_alerts: true,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        digest_frequency: 'never',
        batch_notifications: false,
        sound_enabled: true,
        sound_volume: 70,
      },
      accessibility: {
        high_contrast: false,
        large_text: false,
        reduce_motion: false,
        screen_reader: false,
        focus_indicators: true,
        keyboard_navigation: true,
        text_to_speech: false,
        speech_rate: 1,
        font_size: 16,
        color_blind_mode: 'none',
      },
    },
  });

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        const settings = await ipcClient.settings.getUserSettings(user.token);

        // Apply loaded preferences to form
        if (settings) {
          form.reset({
            preferences: settings.preferences,
            notifications: settings.notifications,
            accessibility: settings.accessibility,
          });
        }

        logInfo('Preferences loaded successfully', { userId: user.user_id });
      } catch (error) {
        logError('Failed to load preferences', {
          error: error instanceof Error ? error.message : error,
          userId: user.user_id
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.token, user?.user_id, form, logInfo, logError]);

  const onSubmit = async (data: PreferencesFormData) => {
    if (!user?.token) {
      setSaveError('Session expirée. Veuillez vous reconnecter.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    logUserAction('Preferences update initiated', {
      sections: Object.keys(data),
      userId: user.user_id
    });

    try {
      // Update each settings section individually
      const updatePromises = [];
      const dirtyFields = form.formState.dirtyFields as {
        preferences?: Record<string, unknown>;
        notifications?: Record<string, unknown>;
        accessibility?: Record<string, unknown>;
      };

      if (dirtyFields.preferences && Object.keys(dirtyFields.preferences).length > 0) {
        updatePromises.push(
          ipcClient.settings.updateUserPreferences(data.preferences, user.token)
        );
      }

      if (dirtyFields.notifications && Object.keys(dirtyFields.notifications).length > 0) {
        updatePromises.push(
          ipcClient.settings.updateUserNotifications(data.notifications, user.token)
        );
      }

      if (dirtyFields.accessibility && Object.keys(dirtyFields.accessibility).length > 0) {
        updatePromises.push(
          ipcClient.settings.updateUserAccessibility(data.accessibility, user.token)
        );
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      setSaveSuccess(true);
      logInfo('All preferences updated successfully', {
        userId: user.user_id,
        sectionsUpdated: Object.keys(data).filter(key => Object.keys(data[key as keyof typeof data]).length > 0)
      });

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      const settingsError = SettingsErrorHandler.handleApiError(error, 'preferences_update');

      setSaveError(settingsError.message);
      logError('Preferences update failed', {
        error: settingsError,
        userId: user.user_id,
        sectionsAttempted: Object.keys(data),
        retryable: SettingsErrorHandler.isRetryableError(settingsError)
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    form,
    isLoading,
    isSaving,
    saveSuccess,
    saveError,
    onSubmit,
  };
}
