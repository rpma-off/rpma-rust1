/**
 * notifications Domain - Public API
 */

export { NotificationsProvider, useNotificationsContext } from './NotificationsProvider';
export { useMessages, useMessageTemplates, useNotificationPreferences } from './useMessages';

export { MessageComposer } from '../components/MessageComposer';
export { MessageInbox } from '../components/MessageInbox';
export { NotificationPreferences } from '../components/NotificationPreferences';

export { notificationService, NotificationService } from '../server';

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
