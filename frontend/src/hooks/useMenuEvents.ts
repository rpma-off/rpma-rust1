import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useRouter } from 'next/navigation';

export function useMenuEvents() {
  const router = useRouter();

  useEffect(() => {
    let unlistenNav: (() => void) | null = null;
    let unlistenAction: (() => void) | null = null;

    const setupListeners = async () => {
      if (typeof window === 'undefined') return;

      const internals = (window as Window & {
        __TAURI_INTERNALS__?: { transformCallback?: unknown; invoke?: unknown }
      }).__TAURI_INTERNALS__;

      // In tests and non-Tauri contexts, event APIs may be unavailable.
      if (!internals || typeof internals.invoke !== 'function' || typeof internals.transformCallback !== 'function') {
        return;
      }

      try {
        unlistenNav = await listen<string>('menu-navigate', (event) => {
          const view = event.payload;
          const pathMap: Record<string, string> = {
            dashboard: '/dashboard',
            tasks: '/tasks',
            clients: '/clients',
            calendar: '/calendar',
            reports: '/reports',
            settings: '/configuration',
          };
          const path = pathMap[view];
          if (path) {
            router.push(path);
          }
        });

        unlistenAction = await listen<string>('menu-action', (event) => {
          const action = event.payload;
          handleMenuAction(action);
        });
      } catch (error) {
        console.warn('Menu event listeners could not be initialized', error);
      }
    };

    void setupListeners();

    return () => {
      try {
        unlistenNav?.();
      } catch {
        // noop
      }
      try {
        unlistenAction?.();
      } catch {
        // noop
      }
    };
  }, [router]);
}

function handleMenuAction(action: string) {
  switch (action) {
    case 'new_task':
      window.location.href = '/tasks/new';
      break;
    case 'new_client':
      window.location.href = '/clients/new';
      break;
    case 'start_intervention':
      // Emit event for intervention modal
      window.dispatchEvent(new CustomEvent('open-intervention-modal'));
      break;
    case 'resume_intervention':
      // Emit event for resuming intervention
      window.dispatchEvent(new CustomEvent('resume-intervention-modal'));
      break;
    case 'photo_capture':
      // Emit event for photo capture
      window.dispatchEvent(new CustomEvent('open-photo-capture'));
      break;
    case 'material_usage':
      // Emit event for material usage
      window.dispatchEvent(new CustomEvent('open-material-usage'));
      break;
    case 'quality_check':
      // Emit event for quality check
      window.dispatchEvent(new CustomEvent('open-quality-check'));
      break;
    case 'sync_now':
      // Trigger sync - this will be handled by existing sync service
      window.dispatchEvent(new CustomEvent('trigger-sync'));
      break;
    case 'sync_status':
      // Open sync status dialog
      window.dispatchEvent(new CustomEvent('open-sync-status'));
      break;
    case 'db_status':
      // Open database status dialog
      window.dispatchEvent(new CustomEvent('open-db-status'));
      break;
    case 'vacuum_db':
      // Trigger database vacuum
      window.dispatchEvent(new CustomEvent('vacuum-database'));
      break;
    case 'dev_tools':
      // Open developer tools
      window.dispatchEvent(new CustomEvent('open-dev-tools'));
      break;
    case 'go_back':
      window.history.back();
      break;
    case 'go_forward':
      window.history.forward();
      break;
    case 'search':
      // Focus search input
      window.dispatchEvent(new CustomEvent('focus-search'));
      break;
    case 'quick_actions':
      // Open quick actions modal
      window.dispatchEvent(new CustomEvent('open-quick-actions'));
      break;
    case 'refresh':
      window.location.reload();
      break;
    case 'toggle_sidebar':
      // Emit event for sidebar toggle
      window.dispatchEvent(new CustomEvent('toggle-sidebar'));
      break;
    case 'toggle_fullscreen':
      // Toggle fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
      break;
    case 'documentation':
      // Open documentation
      window.open('https://opencode.ai/docs', '_blank');
      break;
    case 'keyboard_shortcuts':
      // Open keyboard shortcuts help
      window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts'));
      break;
    case 'check_updates':
      // Check for updates
      window.dispatchEvent(new CustomEvent('check-updates'));
      break;
    case 'about':
      // Open about dialog
      window.dispatchEvent(new CustomEvent('open-about'));
      break;
    case 'report_issue':
      // Open issue reporting
      window.open('https://github.com/sst/opencode/issues', '_blank');
      break;
    case 'export_report':
      // Open export report dialog
      window.dispatchEvent(new CustomEvent('open-export-report'));
      break;
    case 'import_data':
      // Open import data dialog
      window.dispatchEvent(new CustomEvent('open-import-data'));
      break;
    default:
      console.warn('Unhandled menu action:', action);
  }
}
