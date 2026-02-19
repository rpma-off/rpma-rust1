'use client';

import {
  useMessage,
  useMessageTemplates,
  useNotificationPreferences,
} from '../hooks/useMessage';

export function useMessages() {
  return useMessage();
}

export { useMessageTemplates, useNotificationPreferences };
