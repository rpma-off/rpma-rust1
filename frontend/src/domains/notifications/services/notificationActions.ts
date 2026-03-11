import { notificationApi } from '@/lib/ipc/notification';
import { toast } from 'sonner';

export async function getNotifications() {
  try {
    const result = await notificationApi.get();
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    toast.error(message);
    return { success: false, error: message };
  }
}

export async function markNotificationRead(id: string) {
  try {
    await notificationApi.markRead(id);
    return { success: true };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false };
  }
}

export async function markAllNotificationsRead() {
  try {
    await notificationApi.markAllRead();
    return { success: true };
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false };
  }
}

export async function deleteNotification(id: string) {
  try {
    await notificationApi.delete(id);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return { success: false };
  }
}
