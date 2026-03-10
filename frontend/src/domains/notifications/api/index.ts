/**
 * notifications Domain - Public API
 */

export { NotificationsProvider, useNotificationsContext } from './NotificationsProvider';
/** TODO: document */
export { useMessages, useMessageTemplates, useNotificationPreferences } from './useMessages';

/** TODO: document */
export { MessageComposer } from '../components/MessageComposer';
/** TODO: document */
export { MessageInbox } from '../components/MessageInbox';
/** TODO: document */
export { NotificationPreferences } from '../components/NotificationPreferences';

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
export { useMessagesPage } from '../hooks/useMessagesPage';

/** TODO: document */
export { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/notificationActions';

/** TODO: document */
export { notificationService, NotificationService } from '../server';

/** TODO: document */
export type {
  Message,
  MessageTemplate,
  MessageQuery,
  MessageListResponse,
  SendMessageRequest,
  UpdateNotificationPreferencesRequest,
  NotificationPreferences as NotificationPreferencesType,
  UseMessagesResult,
} from './types';

export type { Notification } from './notificationTypes';
export type { GetNotificationsResponse, SuccessResponse, CreateNotificationRequest } from './notificationTypes';

