// VIOLATION: This layout is a Client Component ('use client') with `useEffect`
// hooks that run on every render caused by navigation. `getTabConfig` is
// recreated inline on every render — move it outside the component or wrap
// with `useMemo` to stabilise the reference and prevent unnecessary
// re-renders of child components that receive it as a prop.
'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Bell,
  Shield,
  Zap,
  Eye,
  HelpCircle,
  Menu,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/shared/utils';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { PageHeader } from '@/components/ui/page-header';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useAuth } from '@/domains/auth';

const getTabConfig = (t: (key: string, params?: Record<string, string | number>) => string) => [
  {
    id: 'profile',
    label: t('nav.profile'),
    icon: User,
    href: '/settings/profile'
  },
  {
    id: 'preferences',
    label: t('settings.preferences'),
    icon: Bell,
    href: '/settings/preferences'
  },
  {
    id: 'security',
    label: t('settings.security'),
    icon: Shield,
    href: '/settings/security'
  },
  {
    id: 'performance',
    label: t('analytics.performance'),
    icon: Zap,
    href: '/settings/performance'
  },
  {
    id: 'accessibility',
    label: t('settings.accessibility'),
    icon: Eye,
    href: '/settings/accessibility'
  },
  {
    id: 'notifications',
    label: t('settings.notifications'),
    icon: Bell,
    href: '/settings/notifications'
  }
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { t } = useTranslation();
  const tabConfig = getTabConfig(t);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading: _authLoading } = useAuth();

  const { logInfo, logUserAction, logPerformance } = useLogger({
    context: LogDomain.USER,
    component: 'SettingsLayout',
    enablePerformanceLogging: true
  });

  const activeTab = tabConfig.find(tab => pathname === tab.href || pathname.startsWith(tab.href + '/'))?.id || 'profile';

  useEffect(() => {
    const timer = logPerformance('Settings page load');
    logInfo('Settings page loaded', {
      activeTab,
      pathname,
      userId: user?.user_id,
      hasProfile: !!profile
    });
    timer();
  }, [activeTab, pathname, logInfo, logPerformance, profile, user?.user_id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const tabIndex = parseInt(event.key) - 1;
        if (tabIndex >= 0 && tabIndex < tabConfig.length && tabConfig[tabIndex]) {
          event.preventDefault();
          logUserAction('Tab navigation via keyboard shortcut', {
            fromTab: activeTab,
            toTab: tabConfig[tabIndex].id,
            shortcut: `Ctrl+${event.key}`
          });
          router.push(tabConfig[tabIndex].href);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logUserAction, activeTab, tabConfig, router]);

  if (_authLoading) {
    return (
      <PageShell>
        <LoadingState message={t('common.loading')} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.account')}
        icon={<Settings className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />}
        actions={
          <>
            <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">1-6</kbd>
              <span>{t('common.navigation').toLowerCase()}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted/10">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <Card className="rpma-shell">
        <CardHeader className="pb-4 border-b border-[hsl(var(--rpma-border))]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[hsl(var(--rpma-teal))]/20 rounded-lg">
              <User className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{t('settings.title')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('settings.account')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="lg:hidden mb-4">
            <div className="bg-background/50 rounded-lg p-3 border border-border/30">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-border/60 text-foreground hover:bg-border/20"
                  >
                    <div className="flex items-center">
                      <Menu className="h-4 w-4 mr-3" />
                      <span>{tabConfig.find(tab => tab.id === activeTab)?.label || 'Navigation'}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {tabConfig.findIndex(tab => tab.id === activeTab) + 1}
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh] bg-background border-[hsl(var(--rpma-border))]">
                  <SheetHeader className="text-left">
                    <SheetTitle className="text-foreground flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Parametres
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                      Choisissez une section a configurer
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid grid-cols-1 gap-2 mt-6">
                    {tabConfig.map((tab, index) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <Link key={tab.id} href={tab.href}>
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            className={cn(
                              "justify-start h-12 w-full",
                              isActive
                                ? 'bg-[hsl(var(--rpma-teal))] text-black hover:bg-[hsl(var(--rpma-teal))]/90'
                                : 'text-muted-foreground hover:text-foreground hover:bg-border/20'
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <Icon className="h-4 w-4 mr-3" />
                                {tab.label}
                              </div>
                              <span className="text-xs opacity-60">{index + 1}</span>
                            </div>
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-6 pt-4 border-t border-[hsl(var(--rpma-border))]">
                    <p className="text-xs text-muted-foreground text-center">
                      Utilisez Ctrl+1-6 pour naviguer rapidement (desktop)
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="hidden lg:block bg-[hsl(var(--rpma-teal))] rounded-[10px] px-2">
            <nav className="flex gap-2">
              {tabConfig.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={cn(
                      "flex items-center gap-2 font-medium relative h-12 px-4 uppercase tracking-wide text-xs transition-colors",
                      isActive
                        ? "text-white border-b-[3px] border-white"
                        : "text-white/85 border-b-[3px] border-transparent hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    <span className="absolute -top-1 -right-1 text-xs bg-border/40 text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-60">
                      {index + 1}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-4 md:mt-6">
            {children}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
