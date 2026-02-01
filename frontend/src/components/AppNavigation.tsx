'use client';

import { useAuth } from '@/lib/auth/compatibility';
import { usePathname, useRouter } from 'next/navigation';
import { TopNav } from '@/components/navigation/TopNav';
import { SimpleSidebar } from '@/components/navigation/SimpleSidebar';

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
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - New SimpleSidebar */}
      <SimpleSidebar />
      
      {/* Main Content Area with TopNav */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <TopNav />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}