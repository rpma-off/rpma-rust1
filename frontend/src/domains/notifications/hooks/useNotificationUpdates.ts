'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { useSettings } from '@/domains/settings/api/useSettings';
import type { Notification } from '../api/notificationTypes';
import { getNotifications } from '../services/notificationActions';
import { isInQuietHoursAt } from '../services/quietHours';

export function useNotificationUpdates() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const [knownNotificationIds, setKnownNotificationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;

    // Fetch initial notifications
    if (user?.token) {
      getNotifications().then((result) => {
        if (!mountedRef.current) return;
        if (result.success && result.data) {
          setKnownNotificationIds(new Set(result.data.notifications.map((notification: Notification) => notification.id)));
        }
      });
    }

    function startPolling() {
      if (!mountedRef.current || !user?.token) return;

      // Polling is a 5-minute fallback only — real-time updates arrive via the
      // Tauri `notification:received` event (useTauriEvent.ts → notificationKeys.all).
      pollTimerRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        if (document.visibilityState !== 'visible') return;

        const result = await getNotifications();
        if (result.success && result.data) {
          setKnownNotificationIds((prevIds) => {
            const newIds = new Set(prevIds);
            const newNotifications = result.data.notifications.filter(
              (notification: Notification) => !prevIds.has(notification.id),
            );

            // Show toast for new unread notifications
            newNotifications.forEach((notification: Notification) => {
              const notificationSettings = settings?.notifications;
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
                    label: 'View',
                    onClick: () => {
                      window.location.href = notification.entity_url;
                    },
                  },
                });
              }
              newIds.add(notification.id);
            });

            return newIds;
          });
        }
      }, 300000); // fallback poll — real-time path: Tauri event → useTauriEvent.ts
    }

    startPolling();

    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [settings?.notifications, user?.token]);
}

