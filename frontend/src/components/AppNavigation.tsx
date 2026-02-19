'use client';

import { useAuth } from '@/domains/auth';
import { usePathname } from 'next/navigation';
import { RPMALayout } from '@/components/RPMALayout';

export default function AppNavigation({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Don't render navigation for unauthenticated users or on public routes
  const PUBLIC_ROUTES = ['/login', '/signup', '/unauthorized', '/bootstrap-admin'];
  const shouldShowNavigation = user && !PUBLIC_ROUTES.includes(pathname);

  if (!shouldShowNavigation) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <RPMALayout>
      {children}
    </RPMALayout>
  );
}
