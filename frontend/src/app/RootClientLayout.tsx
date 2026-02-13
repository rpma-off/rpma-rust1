'use client';

import { Providers } from '@/components/providers';
import localFont from "next/font/local";
import "./globals.css";
import AppNavigation from '@/components/AppNavigation';
import { GlobalErrorBoundary } from '@/error-boundaries';
import { SkipLink } from '@/lib/accessibility.tsx';
import { useAuth } from '@/lib/auth/compatibility';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { logger } from '@/lib/logging';
import { CorrelationContext, LogDomain } from '@/lib/logging/types';
import { useMenuEvents } from '@/hooks/useMenuEvents';
import { ThemeProvider } from '@/components/theme-provider';

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

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAuthenticating } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

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
    if (user?.id) {
      CorrelationContext.set({ user_id: user.id });
      logger.info(LogDomain.AUTH, 'User authenticated', {
        user_id: user.id,
        email: user.email,
      });
    } else {
      CorrelationContext.set({ user_id: undefined });
    }
  }, [user]);

  // Show navigation only if user is authenticated and not on public routes
  const shouldShowNavigation = user && !PUBLIC_ROUTES.includes(pathname);

  // Redirect to login if not authenticated and not on public routes
  useEffect(() => {
    if (!authLoading && !isAuthenticating && !user && !PUBLIC_ROUTES.includes(pathname)) {
      router.push('/login');
    }
  }, [user, authLoading, isAuthenticating, pathname, router]);

  // Check admin status for authenticated users and redirect appropriately
   useEffect(() => {
     const checkAdminRedirect = async () => {
       if (!authLoading && !isAuthenticating && user) {
         console.log('checkAdminRedirect running', { pathname, user: user.id });
         try {
           const { ipcClient } = await import('@/lib/ipc');
           const hasAdmins = await ipcClient.bootstrap.hasAdmins();
           console.log('hasAdmins result', hasAdmins);

           if (!hasAdmins && pathname !== '/bootstrap-admin') {
             // No admins exist and not already on bootstrap page, redirect to bootstrap-admin
             console.log('Redirecting to /bootstrap-admin');
             router.push('/bootstrap-admin');
           } else if ((pathname === '/login' || pathname === '/signup') && hasAdmins) {
             // User is authenticated, on login/signup page, and admins exist, redirect to dashboard
             console.log('Redirecting to /dashboard from login/signup');
             router.push('/dashboard');
           } else if ((pathname === '/login' || pathname === '/signup') && !hasAdmins) {
             // User is authenticated, on login/signup page, and no admins exist, redirect to bootstrap-admin
             console.log('Redirecting to /bootstrap-admin from login/signup');
             router.push('/bootstrap-admin');
           } else {
             console.log('No redirect needed', { hasAdmins, pathname });
           }
         } catch (error) {
           console.error('Failed to check admin status:', error);
           // Default to dashboard on error
           if (pathname === '/login' || pathname === '/signup') {
             router.push('/dashboard');
           }
         }
       }
     };

     checkAdminRedirect();
   }, [user, authLoading, isAuthenticating, pathname, router]);

   // Show loading screen during authentication check or redirect
  if (authLoading || isAuthenticating || (!user && !PUBLIC_ROUTES.includes(pathname))) {
    return (
      <div className="fixed inset-0 bg-background text-foreground z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--rpma-teal))] mx-auto mb-4"></div>
          <p className="text-muted-foreground">{authLoading || isAuthenticating ? 'Chargement...' : 'Redirection vers la connexion...'}</p>
        </div>
      </div>
    );
  }

return shouldShowNavigation ? (
     <AppNavigation>
       {children}
     </AppNavigation>
   ) : (
      <div className="min-h-screen bg-background">
        {children}
      </div>
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
