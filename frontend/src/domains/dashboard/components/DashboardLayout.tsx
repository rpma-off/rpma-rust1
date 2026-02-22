'use client';

import { ReactNode } from 'react';
import { useDashboard } from '../api';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { stats, loading } = useDashboard();

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur RPMA v2</p>
        </div>
      </header>

      <main className="dashboard-content">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-primary))]"></div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
