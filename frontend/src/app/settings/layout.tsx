'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Bell,
  Shield,
  Building2,
  HelpCircle,
  Menu,
  Settings,
  Workflow,
  Globe,
  Zap,
  Activity,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
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
import { useSystemHealth } from '@/domains/admin';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  adminOnly?: boolean;
  isConfig?: boolean;
}

const getUserTabs = (t: (key: string) => string): TabConfig[] => [
  { id: 'profile',      label: t('nav.profile'),           icon: User,      href: '/settings/profile' },
  { id: 'preferences',  label: t('settings.preferences'),  icon: Bell,      href: '/settings/preferences' },
  { id: 'security',     label: t('settings.security'),     icon: Shield,    href: '/settings/security' },
  { id: 'organization', label: 'Atelier',                  icon: Building2, href: '/settings/organization', adminOnly: true },
];

const getConfigTabs = (): TabConfig[] => [
  { id: 'system',             label: 'Système',        icon: Settings,  href: '/settings/system',             adminOnly: true, isConfig: true },
  { id: 'business',           label: 'Règles',          icon: Workflow,  href: '/settings/business',           adminOnly: true, isConfig: true },
  { id: 'security-policies',  label: 'Sécu. Système',  icon: Shield,    href: '/settings/security-policies',  adminOnly: true, isConfig: true },
  { id: 'integrations',       label: 'Intégrations',   icon: Globe,     href: '/settings/integrations',       adminOnly: true, isConfig: true },
  { id: 'performance',        label: 'Performance',    icon: Zap,       href: '/settings/performance',        adminOnly: true, isConfig: true },
  { id: 'monitoring',         label: 'Monitoring',     icon: Activity,  href: '/settings/monitoring',         adminOnly: true, isConfig: true },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  const userTabs = getUserTabs(t).filter(tab => !tab.adminOnly || isAdmin);
  const configTabs = isAdmin ? getConfigTabs() : [];
  const allTabs = [...userTabs, ...configTabs];

  const { systemStatus, refreshing: isRefreshing, refresh } = useSystemHealth({
    pollInterval: isAdmin ? 30000 : 0,
    autoStart: isAdmin,
  });

  const { logInfo, logUserAction, logPerformance } = useLogger({
    context: LogDomain.USER,
    component: 'SettingsLayout',
    enablePerformanceLogging: true,
  });

  const activeTab = allTabs.find(
    tab => pathname === tab.href || pathname.startsWith(tab.href + '/')
  )?.id ?? 'profile';

  useEffect(() => {
    const timer = logPerformance('Settings page load');
    logInfo('Settings page loaded', { activeTab, pathname, userId: user?.user_id });
    timer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const num = parseInt(event.key);
      if (!isNaN(num) && num >= 1 && num <= allTabs.length) {
        const tab = allTabs[num - 1];
        if (tab) {
          event.preventDefault();
          logUserAction('Tab navigation via keyboard shortcut', {
            fromTab: activeTab,
            toTab: tab.id,
            shortcut: `Ctrl+${event.key}`,
          });
          router.push(tab.href);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logUserAction, activeTab, allTabs, router]);

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':   return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'healthy': return 'Système opérationnel';
      case 'warning': return 'Avertissements détectés';
      case 'error':   return 'Erreurs détectées';
    }
  };

  if (authLoading) {
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
            {isAdmin && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--rpma-surface))] rounded-[6px] border border-[hsl(var(--rpma-border))]">
                  {getStatusIcon()}
                  <span className="text-sm font-medium text-foreground">{getStatusText()}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Actualiser</span>
                </Button>
              </>
            )}
            <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">1-{allTabs.length}</kbd>
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
              <CardDescription className="text-muted-foreground">{t('settings.account')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Navigation */}
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
                      <span>{allTabs.find(tab => tab.id === activeTab)?.label ?? 'Navigation'}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {allTabs.findIndex(tab => tab.id === activeTab) + 1}
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh] bg-background border-[hsl(var(--rpma-border))]">
                  <SheetHeader className="text-left">
                    <SheetTitle className="text-foreground flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Paramètres
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                      Choisissez une section à configurer
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid grid-cols-1 gap-2 mt-6">
                    {userTabs.map((tab, index) => {
                      const Icon = tab.icon;
                      return (
                        <Link key={tab.id} href={tab.href}>
                          <Button
                            variant={activeTab === tab.id ? 'default' : 'ghost'}
                            className={cn('justify-start h-12 w-full', activeTab === tab.id
                              ? 'bg-[hsl(var(--rpma-teal))] text-black hover:bg-[hsl(var(--rpma-teal))]/90'
                              : 'text-muted-foreground hover:text-foreground hover:bg-border/20'
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center"><Icon className="h-4 w-4 mr-3" />{tab.label}</div>
                              <span className="text-xs opacity-60">{index + 1}</span>
                            </div>
                          </Button>
                        </Link>
                      );
                    })}
                    {isAdmin && configTabs.length > 0 && (
                      <>
                        <div className="border-t border-[hsl(var(--rpma-border))] my-2 pt-2">
                          <p className="text-xs text-muted-foreground px-1 mb-2 font-medium uppercase tracking-wide">Configuration</p>
                        </div>
                        {configTabs.map((tab, index) => {
                          const Icon = tab.icon;
                          return (
                            <Link key={tab.id} href={tab.href}>
                              <Button
                                variant={activeTab === tab.id ? 'default' : 'ghost'}
                                className={cn('justify-start h-12 w-full', activeTab === tab.id
                                  ? 'bg-[hsl(var(--rpma-teal))] text-black hover:bg-[hsl(var(--rpma-teal))]/90'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-border/20'
                                )}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center"><Icon className="h-4 w-4 mr-3" />{tab.label}</div>
                                  <span className="text-xs opacity-60">{userTabs.length + index + 1}</span>
                                </div>
                              </Button>
                            </Link>
                          );
                        })}
                      </>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-[hsl(var(--rpma-border))]">
                    <p className="text-xs text-muted-foreground text-center">
                      Utilisez Ctrl+1-{allTabs.length} pour naviguer rapidement (desktop)
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:block bg-[hsl(var(--rpma-teal))] rounded-[10px] px-2">
            <nav className="flex gap-2 items-center">
              {userTabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={cn(
                      'flex items-center gap-2 font-medium relative h-12 px-4 uppercase tracking-wide text-xs transition-colors',
                      isActive
                        ? 'text-white border-b-[3px] border-white'
                        : 'text-white/85 border-b-[3px] border-transparent hover:text-white'
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

              {isAdmin && configTabs.length > 0 && (
                <>
                  <div className="h-6 w-px bg-white/30 mx-1" />
                  {configTabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <Link
                        key={tab.id}
                        href={tab.href}
                        className={cn(
                          'flex items-center gap-2 font-medium relative h-12 px-4 uppercase tracking-wide text-xs transition-colors',
                          isActive
                            ? 'text-white border-b-[3px] border-white'
                            : 'text-white/85 border-b-[3px] border-transparent hover:text-white'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        <span className="absolute -top-1 -right-1 text-xs bg-border/40 text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-60">
                          {userTabs.length + index + 1}
                        </span>
                      </Link>
                    );
                  })}
                </>
              )}
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
