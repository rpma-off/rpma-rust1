"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useIpcClient } from "@/lib/ipc/client";
import { userSettingsKeys } from "@/lib/query-keys";
import type { JsonObject } from "@/types/json";
import { useAuth } from "@/shared/hooks/useAuth";

const DEFAULT_PREFERENCES = {
  theme: "system",
  language: "fr",
  compactView: false,
  showNotifications: true,
};

const DEFAULT_ACCESSIBILITY = {
  font_size: "medium",
  high_contrast: false,
  reduce_motion: false,
};

const DEFAULT_NOTIFICATIONS = {
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  marketing_emails: false,
};

const DEFAULT_PERFORMANCE = {
  enable_animations: true,
  enable_hardware_acceleration: true,
  cache_ttl: 3600,
};

export function useSettingsActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ipcClient = useIpcClient();

  const onSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: userSettingsKeys.byUser(user?.user_id),
    });
  };

  const updatePreferences = useMutation({
    mutationFn: (data: JsonObject) =>
      ipcClient.settings.updateUserPreferences(data),
    onSuccess,
  });

  const updateNotifications = useMutation({
    mutationFn: (data: JsonObject) =>
      ipcClient.settings.updateUserNotifications(data),
    onSuccess,
  });

  const updateAccessibility = useMutation({
    mutationFn: (data: JsonObject) =>
      ipcClient.settings.updateUserAccessibility(data),
    onSuccess,
  });

  const updatePerformance = useMutation({
    mutationFn: (data: JsonObject) =>
      ipcClient.settings.updateUserPerformance(data),
    onSuccess,
  });

  const updateProfile = useMutation({
    mutationFn: (data: JsonObject) =>
      ipcClient.settings.updateUserProfile(data),
    onSuccess,
  });

  const changePassword = useMutation({
    mutationFn: (data: JsonObject) => {
      const currentPassword = String(data.current_password ?? data.currentPassword ?? "");
      const newPassword = String(data.new_password ?? data.newPassword ?? "");
      return ipcClient.auth.changePassword(currentPassword, newPassword);
    },
    onSuccess,
  });

  const resetSettings = useMutation({
    mutationFn: async () => {
      await Promise.all([
        ipcClient.settings.updateUserPreferences(DEFAULT_PREFERENCES),
        ipcClient.settings.updateUserNotifications(DEFAULT_NOTIFICATIONS),
        ipcClient.settings.updateUserAccessibility(DEFAULT_ACCESSIBILITY),
        ipcClient.settings.updateUserPerformance(DEFAULT_PERFORMANCE),
      ]);
    },
    onSuccess,
  });

  return {
    updatePreferences: (data: JsonObject) =>
      updatePreferences
        .mutateAsync(data)
        .then(() => true)
        .catch(() => false),
    updateNotifications: (data: JsonObject) =>
      updateNotifications
        .mutateAsync(data)
        .then(() => true)
        .catch(() => false),
    updateAccessibility: (data: JsonObject) =>
      updateAccessibility
        .mutateAsync(data)
        .then(() => true)
        .catch(() => false),
    updatePerformance: (data: JsonObject) =>
      updatePerformance
        .mutateAsync(data)
        .then(() => true)
        .catch(() => false),
    updateProfile: (data: JsonObject) =>
      updateProfile
        .mutateAsync(data)
        .then(() => true)
        .catch(() => false),
    changePassword: (data: JsonObject) =>
      changePassword
        .mutateAsync(data)
        .then(() => true)
        .catch(() => false),
    resetSettings: () =>
      resetSettings
        .mutateAsync()
        .then(() => true)
        .catch(() => false),
  };
}
