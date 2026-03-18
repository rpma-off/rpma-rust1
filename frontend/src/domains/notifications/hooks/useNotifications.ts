'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@/lib/query-keys';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/notificationActions';

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: async () => {
      const result = await getNotifications();
      if (!result.success) throw new Error(result.error || 'Failed to fetch notifications');
      return result.data;
    },
    refetchInterval: 120000, // 2 minutes
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: (_,  id) => {
      queryClient.removeQueries({ queryKey: notificationKeys.byId(id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unread_count || 0,
    isLoading,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    removeNotification: deleteMutation.mutate,
  };
}
