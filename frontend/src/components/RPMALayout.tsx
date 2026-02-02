'use client';

import { useState } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
