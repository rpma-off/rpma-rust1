'use client';

import { Providers } from '@/shared/ui/providers';
import localFont from "next/font/local";
import "./globals.css";
import AppNavigation from '@/shared/ui/AppNavigation';
import { GlobalErrorBoundary, SkipLink } from '@/shared/ui';
import { useAuth } from '@/domains/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { structuredLogger as logger, CorrelationContext, LogDomain } from '@/shared/utils';
import { useMenuEvents } from '@/shared/hooks/useMenuEvents';
import { ThemeProvider } from '@/shared/ui/theme-provider';

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
         logger.debug(LogDomain.AUTH, 'Admin redirect check started', {
            pathname,
            user_id: user.user_id
          });
         try {
           const { ipcClient } = await import('@/shared/utils');
           const hasAdmins = await ipcClient.bootstrap.hasAdmins();
           logger.debug(LogDomain.AUTH, 'Admin check result', {
             has_admins: hasAdmins,
                pathname,
                user_id: user.user_id
              });

           if (!hasAdmins && pathname !== '/bootstrap-admin') {
             // No admins exist and not already on bootstrap page, redirect to bootstrap-admin
             logger.info(LogDomain.AUTH, 'Redirecting to /bootstrap-admin', {
                pathname,
                user_id: user.user_id
              });
             router.push('/bootstrap-admin');
           } else if ((pathname === '/login' || pathname === '/signup') && hasAdmins) {
             // User is authenticated, on login/signup page, and admins exist, redirect to dashboard
             logger.info(LogDomain.AUTH, 'Redirecting to /dashboard from login/signup', {
                pathname,
                user_id: user.user_id
              });
             router.push('/dashboard');
           } else if ((pathname === '/login' || pathname === '/signup') && !hasAdmins) {
             // User is authenticated, on login/signup page, and no admins exist, redirect to bootstrap-admin
             logger.info(LogDomain.AUTH, 'Redirecting to /bootstrap-admin from login/signup', {
               pathname,
               user_id: user.id
             });
             router.push('/bootstrap-admin');
           } else {
             logger.debug(LogDomain.AUTH, 'No redirect needed', {
                has_admins: hasAdmins,
                pathname,
                user_id: user.user_id
              });
           }
         } catch (error) {
           logger.error(LogDomain.AUTH, 'Failed to check admin status', error, {
              pathname,
              user_id: user.user_id
            });
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

