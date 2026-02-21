'use client';

import { useCallback, useState, useEffect } from 'react';

type ConnectionStatus = 'online' | 'offline' | 'checking';

interface UseConnectionStatusProps {
  onStatusChange?: (status: ConnectionStatus) => void;
  showNotifications?: boolean;
}

export function useConnectionStatus({
  onStatusChange,
  showNotifications = true,
}: UseConnectionStatusProps = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const showStatusNotification = useCallback((status: ConnectionStatus) => {
    const title = status === 'online'
      ? 'Vous êtes de nouveau en ligne'
      : 'Vous êtes hors ligne';

    const options: NotificationOptions = {
      body: status === 'online'
        ? 'La synchronisation des données va reprendre.'
        : 'Les modifications seront enregistrées localement et synchronisées lorsque vous serez de nouveau en ligne.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'connection-status',
    };

    // Show notification if the page is not visible
    if (document.visibilityState !== 'visible') {
      new Notification(title, options);
    }
  }, []);

  const showNotification = useCallback((newStatus: ConnectionStatus) => {
    // Check if the browser supports notifications
    if (!('Notification' in window)) return;

    // Request permission if needed
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showStatusNotification(newStatus);
        }
      });
    } else if (Notification.permission === 'granted') {
      showStatusNotification(newStatus);
    }
  }, [showStatusNotification]);

  // Check initial status
  useEffect(() => {
    const updateStatus = () => {
      const newStatus = navigator.onLine ? 'online' : 'offline';
      setStatus(newStatus);
      setLastSeen(new Date());
      onStatusChange?.(newStatus);

      if (showNotifications && isInitialized) {
        showNotification(newStatus);
      }

      if (!isInitialized) {
        setIsInitialized(true);
      }
    };

    // Set initial status
    updateStatus();

    // Add event listeners
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Clean up
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [onStatusChange, showNotifications, isInitialized, showNotification]);

  return {
    isOnline: status === 'online',
    isOffline: status === 'offline',
    status,
    lastSeen,
  };
}
