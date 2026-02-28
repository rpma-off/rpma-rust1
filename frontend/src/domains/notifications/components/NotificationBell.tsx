'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '../stores/notificationStore';

export function NotificationBell() {
  const { unreadCount, setPanelOpen } = useNotificationStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 text-white hover:bg-white/15"
      onClick={() => setPanelOpen(true)}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-medium text-[hsl(var(--rpma-teal))]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );
}
