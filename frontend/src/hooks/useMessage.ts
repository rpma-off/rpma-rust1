import { useState, useEffect, useCallback } from 'react';
import { messageApi } from '@/lib/ipc/message';
import type {
  Message,
  MessageQuery,
  MessageListResponse,
  MessageTemplate,
  NotificationPreferences,
  SendMessageRequest,
  UpdateNotificationPreferencesRequest
} from '@/lib/backend';
import { toast } from 'sonner';

export function useMessage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const sendMessage = useCallback(async (request: SendMessageRequest) => {
    try {
      const message = await messageApi.send(request);
      toast.success('Message sent successfully');
      return { success: true, data: message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const fetchMessages = useCallback(async (query: MessageQuery = {
    message_type: null,
    sender_id: null,
    recipient_id: null,
    task_id: null,
    client_id: null,
    status: null,
    priority: null,
    date_from: null,
    date_to: null,
    limit: null,
    offset: null,
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response: MessageListResponse = await messageApi.getList(query);
      setMessages(response.messages);
      setTotal(response.total);
      setHasMore(response.has_more);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await messageApi.markRead(messageId);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, status: 'read', read_at: BigInt(Date.now()) }
            : msg
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark message as read';
      toast.error(message);
    }
  }, []);

  return {
    messages,
    loading,
    error,
    total,
    hasMore,
    sendMessage,
    fetchMessages,
    markAsRead,
  };
}

export function useMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (
    category?: string,
    messageType?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      const data = await messageApi.getTemplates(category, messageType);
      setTemplates(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
  };
}

export function useNotificationPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await messageApi.getPreferences(uid);
      setPreferences(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preferences';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (
    uid: string,
    updates: UpdateNotificationPreferencesRequest
  ) => {
    try {
      const data = await messageApi.updatePreferences(uid, updates);
      setPreferences(data);
      toast.success('Preferences updated successfully');
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update preferences';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchPreferences(userId);
    }
  }, [userId, fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refetch: () => userId && fetchPreferences(userId),
  };
}