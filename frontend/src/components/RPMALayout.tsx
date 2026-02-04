'use client';

import { AppShell } from '@/components/layout/AppShell';

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

export function RPMALayout({ children, tasks: _tasks, onRefresh: _onRefresh, isRefreshing: _isRefreshing }: RPMALayoutProps) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
