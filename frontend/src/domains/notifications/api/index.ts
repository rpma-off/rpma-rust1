/**
 * notifications Domain - Public API
 */

export { NotificationsProvider, useNotificationsContext } from './NotificationsProvider';

/** TODO: document */
export { NotificationBell } from '../components/NotificationBell';
/** TODO: document */
export { NotificationPanel } from '../components/NotificationPanel';
/** TODO: document */
export { NotificationInitializer } from '../components/NotificationInitializer';

/** TODO: document */
export { useNotificationStore } from '../stores/notificationStore';
/** TODO: document */
export { useNotificationUpdates } from '../hooks/useNotificationUpdates';

/** TODO: document */
export { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/notificationActions';

/** TODO: document */
export { notificationService, NotificationService } from '../server';

export type { Notification } from './notificationTypes';
export type { GetNotificationsResponse, SuccessResponse, CreateNotificationRequest } from './notificationTypes';
