'use client';

import { useAuth } from '@/domains/auth';
import { usePathname } from 'next/navigation';
import { RPMALayout } from '@/components/RPMALayout';

export default function AppNavigation({
  children,
  showNavigationWhileLoading = false,
}: {
  children: React.ReactNode;
  showNavigationWhileLoading?: boolean;
}) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Don't render navigation for unauthenticated users or on public routes
  const PUBLIC_ROUTES = ['/login', '/signup', '/unauthorized', '/bootstrap-admin'];
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const shouldShowNavigation = !isPublicRoute && (showNavigationWhileLoading || !!user);

  if (!shouldShowNavigation) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <RPMALayout>
      {children}
    </RPMALayout>
  );
}
