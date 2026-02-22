import { useEffect, useCallback } from 'react';
import { shortcuts } from '@/lib/utils/desktop';
import type { JsonObject } from '@/types/json';

interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcutList: ShortcutAction[]) {

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    const matchingShortcut = shortcutList.find(shortcut =>
      shortcut.key.toLowerCase() === event.key.toLowerCase() &&
      !!shortcut.ctrlKey === event.ctrlKey &&
      !!shortcut.altKey === event.altKey &&
      !!shortcut.shiftKey === event.shiftKey &&
      !!shortcut.metaKey === event.metaKey
    );

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, [shortcutList]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Register shortcuts with Tauri for menu integration
  useEffect(() => {
    shortcuts.register({ shortcuts: shortcutList as unknown as JsonObject }).catch(console.error);
  }, [shortcutList]);
}

// Predefined shortcuts for the app
export function useAppKeyboardShortcuts(onNavigate?: (view: string) => void) {
  const shortcuts: ShortcutAction[] = [
    {
       key: 'h',
       ctrlKey: true,
       action: () => {
         // Navigate to dashboard
         onNavigate?.('dashboard');
       },
        description: 'Tableau de bord'
      },
      {
        key: 'ArrowRight',
        altKey: true,
        action: () => {
          // Go forward
          window.history.forward();
        },
        description: 'Suivant'
      }
    ];
    return useKeyboardShortcuts(shortcuts);
  }
