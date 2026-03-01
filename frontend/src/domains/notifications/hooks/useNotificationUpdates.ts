'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNotificationStore } from '../stores/notificationStore';
import { getNotifications, markNotificationRead } from '../services/notificationActions';
import { useAuth } from '@/domains/auth';

export function useNotificationUpdates() {
  const { user } = useAuth();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Fetch initial notifications
    if (user?.token) {
      getNotifications().then((result) => {
        if (!mountedRef.current) return;
        if (result.success && result.data) {
          useNotificationStore.getState().setNotifications(
            result.data.notifications,
            result.data.unread_count,
          );
        }
      });
    }

    function startPolling() {
      if (!mountedRef.current || !user?.token) return;

      pollTimerRef.current = setInterval(async () => {
        if (!mountedRef.current) return;

        const result = await getNotifications();
        if (result.success && result.data) {
          const currentIds = new Set(useNotificationStore.getState().notifications.map(n => n.id));
          const newNotifications = result.data.notifications.filter(n => !currentIds.has(n.id));

          // Show toast for new unread notifications
          newNotifications.forEach((notification) => {
            if (!notification.read) {
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
          });

          useNotificationStore.getState().setNotifications(
            result.data.notifications,
            result.data.unread_count,
          );
        }
      }, 30000); // Poll every 30 seconds
    }

    startPolling();

    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [user?.token]);
}
