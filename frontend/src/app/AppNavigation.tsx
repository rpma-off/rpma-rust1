'use client';

import { useAuth } from '@/domains/auth';
import { usePathname } from 'next/navigation';
import { RPMALayout } from '@/components/RPMALayout';

export default function AppNavigation({
  children,
  forceNavigation = false,
}: {
  children: React.ReactNode;
  forceNavigation?: boolean;
}) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Don't render navigation for unauthenticated users or on public routes
  const PUBLIC_ROUTES = ['/login', '/signup', '/unauthorized', '/bootstrap-admin'];
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const shouldShowNavigation = !isPublicRoute && (forceNavigation || !!user);

  if (!shouldShowNavigation) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <RPMALayout>
      {children}
    </RPMALayout>
  );
}
