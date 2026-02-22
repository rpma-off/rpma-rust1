'use client';

import { Providers } from '@/app/providers';
import localFont from "next/font/local";
import "./globals.css";
import AppNavigation from '@/app/AppNavigation';
import { GlobalErrorBoundary, SkipLink } from '@/shared/ui';
import { useAuth } from '@/domains/auth';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { structuredLogger as logger, CorrelationContext, LogDomain } from '@/shared/utils';
import { useMenuEvents } from '@/shared/hooks/useMenuEvents';
import { useAuthRedirect } from '@/shared/hooks/useAuthRedirect';
import { useAdminBootstrapCheck } from '@/shared/hooks/useAdminBootstrapCheck';
import { ThemeProvider } from '@/shared/ui/theme-provider';
import { Skeleton, SkeletonList } from '@/shared/ui/ui/skeleton';
import { cn } from '@/lib/utils';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Routes that should not show the sidebar (public/auth pages)
const PUBLIC_ROUTES = ['/login', '/signup', '/unauthorized', '/bootstrap-admin'];

function AuthLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <SkeletonList count={3} />
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAuthenticating } = useAuth();
  const pathname = usePathname();

  // Initialize menu event listeners for authenticated users
  useMenuEvents();

  // Initialize logging system
  useEffect(() => {
    logger.info(LogDomain.SYSTEM, 'Application started', {
      user_agent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Update logger with user ID when user changes
  useEffect(() => {
    if (user?.user_id) {
      CorrelationContext.set({ user_id: user.user_id });
      logger.info(LogDomain.AUTH, 'User authenticated', {
        user_id: user.user_id,
        email: user.email,
      });
    } else {
      CorrelationContext.set({ user_id: undefined });
    }
  }, [user]);

  useAuthRedirect(user, authLoading, isAuthenticating);
  useAdminBootstrapCheck(user, authLoading, isAuthenticating);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthPending = authLoading || isAuthenticating;
  const shouldShowLoading = !isPublicRoute && (isAuthPending || !user);
  const isUnauthenticatedProtectedRoute = !isAuthPending && !user && !isPublicRoute;
  const redirectLoadingClassName = 'min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6';
  const loadingClassName = isUnauthenticatedProtectedRoute
    ? redirectLoadingClassName
    : undefined;
  const content = shouldShowLoading ? (
    <AuthLoadingSkeleton className={loadingClassName} />
  ) : (
    children
  );

  return (
    <AppNavigation showNavigationWhileLoading={isAuthPending && !isPublicRoute}>
      {content}
    </AppNavigation>
  );
}

export default function RootClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {/* Skip to main content link for accessibility */}
      <SkipLink href="#main-content">
        Aller au contenu principal
      </SkipLink>

        <GlobalErrorBoundary>
          <Providers>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AppLayout>
                {children}
              </AppLayout>
            </ThemeProvider>
          </Providers>
        </GlobalErrorBoundary>
    </div>
  );
}
