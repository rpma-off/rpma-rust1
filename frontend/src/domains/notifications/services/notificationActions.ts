import { notificationApi, type GetNotificationsResponse, type SuccessResponse } from '@/lib/ipc/notification';
import { getSessionToken } from '@/domains/auth/services/sessionToken';
import { toast } from 'sonner';

export async function getNotifications() {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { success: false, error: 'Not authenticated' };

  try {
    const result = await notificationApi.get(sessionToken);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    toast.error(message);
    return { success: false, error: message };
  }
}

export async function markNotificationRead(id: string) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { success: false };

  try {
    await notificationApi.markRead(id, sessionToken);
    return { success: true };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false };
  }
}

export async function markAllNotificationsRead() {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { success: false };

  try {
    await notificationApi.markAllRead(sessionToken);
    return { success: true };
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false };
  }
}

export async function deleteNotification(id: string) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { success: false };

  try {
    await notificationApi.delete(id, sessionToken);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return { success: false };
  }
}
