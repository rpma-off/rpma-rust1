'use client';

import { useState, useEffect } from 'react';
import { RPMAHeader } from '@/components/navigation/RPMAHeader';
import { RPMASidebar, RPMAMobileSidebar } from '@/components/navigation/RPMASidebar';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title?: string;
  vehicle?: string;
  customer_name?: string;
}

interface RPMALayoutProps {
  children: React.ReactNode;
  tasks?: Task[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function RPMALayout({ children, tasks, onRefresh, isRefreshing }: RPMALayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('rpma-mobile-menu-open') === 'true';
    } catch {
      return false;
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('rpma-sidebar-open') === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('rpma-mobile-menu-open', String(isMobileMenuOpen));
    } catch (error) {
      console.warn('Failed to save mobile menu state to localStorage:', error);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('rpma-sidebar-open', String(isSidebarOpen));
    } catch (error) {
      console.warn('Failed to save sidebar state to localStorage:', error);
    }
  }, [isSidebarOpen]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <RPMAMobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <RPMAHeader
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        tasks={tasks}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <RPMASidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
