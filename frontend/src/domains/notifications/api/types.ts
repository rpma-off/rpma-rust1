import type {
  Message,
  MessageTemplate,
  MessageQuery,
  MessageListResponse,
  SendMessageRequest,
  UpdateNotificationPreferencesRequest,
  NotificationPreferences,
} from '@/lib/backend';

export type {
  Message,
  MessageTemplate,
  MessageQuery,
  MessageListResponse,
  SendMessageRequest,
  UpdateNotificationPreferencesRequest,
  NotificationPreferences,
};

export interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  total: number;
  fetchMessages: (query?: MessageQuery) => Promise<void>;
}
