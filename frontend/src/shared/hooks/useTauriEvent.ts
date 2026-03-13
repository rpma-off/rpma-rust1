import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import { interventionKeys, notificationKeys, taskKeys } from '@/lib/query-keys';

/**
 * Mounts real-time Tauri event listeners that invalidate TanStack Query caches
 * whenever the backend pushes a relevant domain event.
 *
 * Mount this hook at the layout level so all domain queries auto-refresh
 * without polling.
 *
 * @remarks
 * Only active inside a Tauri context. The hook is a no-op in browsers and
 * test environments where `__TAURI_INTERNALS__` is unavailable.
 */
export function useTauriEvent(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const internals = (
      window as Window & {
        __TAURI_INTERNALS__?: { transformCallback?: unknown; invoke?: unknown };
      }
    ).__TAURI_INTERNALS__;

    // In tests and non-Tauri contexts, event APIs may be unavailable.
    if (
      !internals ||
      typeof internals.invoke !== 'function' ||
      typeof internals.transformCallback !== 'function'
    ) {
      return;
    }

    const unlistenPromises = [
      listen('task:status_changed', () => {
        void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      }),

      listen('intervention:started', () => {
        void queryClient.invalidateQueries({ queryKey: interventionKeys.all });
      }),

      listen('notification:received', () => {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }),

      // TODO: ADD_MORE_EVENTS — add listen() calls here for additional Tauri events
    ];

    return () => {
      for (const p of unlistenPromises) {
        p.then((unlisten) => unlisten()).catch((err) => {
          console.debug('[useTauriEvent] Failed to remove event listener:', err);
        });
      }
    };
  }, [queryClient]);
}
