"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationKeys, userSettingsKeys } from "@/lib/query-keys";
import { notificationApi } from "@/lib/ipc/notification";
import { useAuth } from "@/shared/hooks/useAuth";
import { ipcClient } from "@/lib/ipc";
import type { Notification } from "../api/notificationTypes";
import { isInQuietHoursAt } from "../services/quietHours";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useNotificationUpdates() {
  const { user } = useAuth();
  const { data: settings } = useQuery({
    queryKey: userSettingsKeys.byUser(user?.user_id),
    queryFn: async () => {
      return await ipcClient.settings.getUserSettings();
    },
    enabled: !!user?.token && !!user?.user_id,
    staleTime: 30_000,
  });

  // Keep a ref of previously-known notification IDs so we can detect new ones
  // across refetches without causing re-renders or stale closure issues.
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const { data } = useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: async () => {
      const result = await notificationApi.get();
      return result;
    },
    enabled: !!user?.token,
    refetchInterval: POLL_INTERVAL,
    // Only refetch when the tab is visible (mirrors the old visibilityState check)
    refetchIntervalInBackground: false,
    staleTime: 60_000,
  });

  // Side-effect: show toasts for newly-discovered notifications
  useEffect(() => {
    if (!data?.notifications) return;

    const currentIds = new Set(
      data.notifications.map((n: Notification) => n.id),
    );

    if (!initializedRef.current) {
      // First load — seed known IDs without toasting
      knownIdsRef.current = currentIds;
      initializedRef.current = true;
      return;
    }

    const notificationSettings = settings?.notifications;

    data.notifications.forEach((notification: Notification) => {
      if (knownIdsRef.current.has(notification.id)) return;

      const shouldSuppressToast =
        !notificationSettings?.in_app_enabled ||
        !!notification.read ||
        !notificationSettings ||
        isInQuietHoursAt(
          notificationSettings,
          new Date(notification.created_at).getTime(),
        );

      if (!shouldSuppressToast) {
        toast(notification.title, {
          description: notification.message,
          action: {
            label: "View",
            onClick: () => {
              window.location.href = notification.entity_url;
            },
          },
        });
      }
    });

    knownIdsRef.current = currentIds;
  }, [data, settings?.notifications]);
}
