'use client';

import { useNotificationUpdates } from '../hooks/useNotificationUpdates';

export function NotificationInitializer() {
  useNotificationUpdates();
  return null;
}
