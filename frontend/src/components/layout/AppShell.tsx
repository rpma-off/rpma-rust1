'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { DrawerSidebar, DrawerSidebarMobile } from '@/components/layout/DrawerSidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hasLoadedSidebarPreference, setHasLoadedSidebarPreference] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedValue = localStorage.getItem('rpma-sidebar-open');
      if (storedValue !== null) {
        setIsSidebarOpen(storedValue !== 'false');
      }
    } catch (error) {
      console.warn('Failed to read sidebar state from localStorage:', error);
    } finally {
      setHasLoadedSidebarPreference(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasLoadedSidebarPreference) return;
    try {
      localStorage.setItem('rpma-sidebar-open', String(isSidebarOpen));
    } catch (error) {
      console.warn('Failed to save sidebar state to localStorage:', error);
    }
  }, [hasLoadedSidebarPreference, isSidebarOpen]);

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--rpma-surface))]">
      <Topbar
        onMenuToggle={() => setIsMobileOpen(true)}
        onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <DrawerSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <DrawerSidebarMobile
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
        />

        <main id="main-content" className="flex-1 overflow-auto bg-[hsl(var(--rpma-surface))]">
          <div className="min-h-full px-4 sm:px-6 lg:px-8 py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
