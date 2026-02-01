import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ipcClient } from '@/lib/ipc';

interface NavigationOptions {
  replace?: boolean;
  scroll?: boolean;
}

export function useDesktopNavigation() {
  const router = useRouter();

  const navigateTo = useCallback(async (path: string, options?: NavigationOptions) => {
    // Update Next.js router
    if (options?.replace) {
      router.replace(path);
    } else {
      router.push(path);
    }

    // Notify Tauri of navigation for window management and history
    try {
      await ipcClient.ui.navigate(path, options as any);
    } catch (error) {
      console.warn('Failed to update Tauri navigation:', error);
    }
  }, [router]);

  const goBack = useCallback(async () => {
    try {
      const previousPath = await ipcClient.ui.goBack();
      if (previousPath) {
        router.push(previousPath);
        return;
      }
    } catch (error) {
      console.warn('Failed to get previous path from Tauri:', error);
    }

    // Fallback to browser back
    router.back();
  }, [router]);

  const goForward = useCallback(async () => {
    try {
      const nextPath = await ipcClient.ui.goForward();
      if (nextPath) {
        router.push(nextPath);
        return;
      }
    } catch (error) {
      console.warn('Failed to get next path from Tauri:', error);
    }
  }, [router]);



  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Left Arrow or Alt+Left Arrow for back
      if ((event.ctrlKey || event.altKey) && event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      }

      // Ctrl+Right Arrow or Alt+Right Arrow for forward
      if ((event.ctrlKey || event.altKey) && event.key === 'ArrowRight') {
        event.preventDefault();
        goForward();
      }

      // Ctrl+H for home/dashboard
      if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        navigateTo('/dashboard');
      }

      // Ctrl+T for tasks
      if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        navigateTo('/tasks');
      }

      // Ctrl+C for clients
      if (event.ctrlKey && event.key === 'c') {
        event.preventDefault();
        navigateTo('/clients');
      }



      // Ctrl+S for settings
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        navigateTo('/configuration');
      }

      // Ctrl+A for admin
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        navigateTo('/admin');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo, goBack, goForward]);

  return {
    navigateTo,
    goBack,
    goForward,
  };
}