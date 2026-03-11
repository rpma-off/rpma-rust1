'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';
import type { UserSession } from '@/lib/backend';
import { useLogger } from '@/shared/hooks/useLogger';

export async function sendTestNotification(
  _recipient: string,
  _sessionToken: string
): Promise<string> {
  throw new Error('External notification channels are not available');
}

// Notification settings form schema
export const notificationsSchema = z.object({
  // Channels
  email_enabled: z.boolean(),
  push_enabled: z.boolean(),
  in_app_enabled: z.boolean(),

  // Task notifications
  task_assigned: z.boolean(),
  task_updated: z.boolean(),
  task_completed: z.boolean(),
  task_overdue: z.boolean(),

  // System notifications
  system_alerts: z.boolean(),
  maintenance: z.boolean(),
  security_alerts: z.boolean(),

  // Schedule
  quiet_hours_enabled: z.boolean(),
  quiet_hours_start: z.string(),
  quiet_hours_end: z.string(),

  // Frequency
  digest_frequency: z.enum(['never', 'daily', 'weekly']),
  batch_notifications: z.boolean(),

  // Sound
  sound_enabled: z.boolean(),
  sound_volume: z.number().min(0).max(100),
});

export type NotificationsFormData = z.infer<typeof notificationsSchema>;

export function useNotificationSettings(user?: UserSession) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.USER,
    component: 'NotificationsTab',
  });

  const form = useForm<NotificationsFormData>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
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
  });

  // Load notification settings
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        const userSettings = await ipcClient.settings.getUserSettings();

        if (userSettings?.notifications) {
          form.reset(userSettings.notifications as unknown as NotificationsFormData);
        }

        logInfo('Notification settings loaded successfully', { userId: user.user_id });
      } catch (error) {
        logError('Failed to load notification settings', {
          error: error instanceof Error ? error.message : error,
          userId: user.user_id
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadNotificationSettings();
  }, [form, logInfo, logError, user?.token, user?.user_id]);

  const onSubmit = async (data: NotificationsFormData) => {
    if (!user?.token) {
      setSaveError('No authentication token available');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    logUserAction('Notification settings update initiated', {
      changedFields: Object.keys(form.formState.dirtyFields),
      userId: user.user_id
    });

    try {
      await ipcClient.settings.updateUserNotifications(data);

      setSaveSuccess(true);
      logInfo('Notification settings updated successfully', { userId: user.user_id });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error saving notification settings';
      setSaveError(errorMessage);
      logError('Notification settings update failed', { error: errorMessage, userId: user.user_id });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    logUserAction('Test notification sent');

    try {
      if (!user?.email) {
        throw new Error('No email address available for current user');
      }

      setSaveError(null);
      await sendTestNotification(user.email, user.token);

      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);

      logInfo('Test notification sent successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test notification failed';
      setSaveError(errorMessage);
      logError('Test notification failed', { error: errorMessage });
    }
  };

  return {
    form,
    isLoading,
    isSaving,
    saveSuccess,
    saveError,
    testNotificationSent,
    onSubmit,
    handleTestNotification,
  };
}
