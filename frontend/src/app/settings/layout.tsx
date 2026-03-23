'use client';

import React, { useEffect, useMemo } from 'react';
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

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavGroup {
  label: string;
  adminOnly?: boolean;
  items: NavItem[];
}

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        label: 'Mon Compte',
        items: [
          { id: 'profile',     label: t('nav.profile'),          icon: User,     href: '/settings/profile' },
          { id: 'preferences', label: t('settings.preferences'), icon: Bell,     href: '/settings/preferences' },
          { id: 'security',    label: t('settings.security'),    icon: Shield,   href: '/settings/security' },
        ],
      },
      {
        label: 'Administration',
        adminOnly: true,
        items: [
          { id: 'organization',      label: 'Atelier',          icon: Building2, href: '/settings/organization' },
          { id: 'system',            label: 'Système',          icon: Settings,  href: '/settings/system' },
          { id: 'business',          label: 'Règles métier',    icon: Workflow,  href: '/settings/business' },
          { id: 'security-policies', label: 'Sécu. Système',   icon: Shield,    href: '/settings/security-policies' },
          { id: 'integrations',      label: 'Intégrations',     icon: Globe,     href: '/settings/integrations' },
          { id: 'observability',     label: 'Observabilité',    icon: Activity,  href: '/settings/observability' },
        ],
      },
    ],
    [t],
  );

  const visibleGroups = useMemo(
    () => navGroups.filter(g => !g.adminOnly || isAdmin),
    [navGroups, isAdmin],
  );

  const allItems = useMemo(
    () => visibleGroups.flatMap(g => g.items),
    [visibleGroups],
  );

  const { systemStatus, refreshing: isRefreshing, refresh } = useSystemHealth({
    pollInterval: isAdmin ? 30000 : 0,
    autoStart: isAdmin,
  });

  const { logInfo, logUserAction, logPerformance } = useLogger({
    context: LogDomain.USER,
    component: 'SettingsLayout',
    enablePerformanceLogging: true,
  });

  const activeTab = allItems.find(
    item => pathname === item.href || pathname.startsWith(item.href + '/'),
  )?.id ?? 'profile';

  const activeLabel = allItems.find(item => item.id === activeTab)?.label ?? 'Navigation';

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
      if (!isNaN(num) && num >= 1 && num <= allItems.length) {
        const item = allItems[num - 1];
        if (item) {
          event.preventDefault();
          logUserAction('Tab navigation via keyboard shortcut', {
            fromTab: activeTab,
            toTab: item.id,
            shortcut: `Ctrl+${event.key}`,
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logUserAction, activeTab, allItems]);

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

        <CardContent className="p-0">
          <div className="flex min-h-[520px]">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-[220px] flex-col border-r border-[hsl(var(--rpma-border))] py-2 shrink-0">
              {visibleGroups.map(group => (
                <div key={group.label} className="mb-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-4 pt-4 pb-1.5 font-semibold">
                    {group.label}
                  </p>
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors',
                          isActive
                            ? 'bg-[hsl(var(--rpma-teal))]/10 text-[hsl(var(--rpma-teal))] font-medium'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-normal',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </aside>

            {/* Content + Mobile Nav */}
            <div className="flex-1 min-w-0 flex flex-col">

              {/* Mobile Nav trigger */}
              <div className="lg:hidden border-b border-[hsl(var(--rpma-border))] px-4 py-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between border-border/60 text-foreground hover:bg-border/20"
                    >
                      <div className="flex items-center gap-3">
                        <Menu className="h-4 w-4" />
                        <span>{activeLabel}</span>
                      </div>
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
                    <div className="mt-6 space-y-1">
                      {visibleGroups.map(group => (
                        <div key={group.label}>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 pt-3 pb-1.5 font-semibold">
                            {group.label}
                          </p>
                          {group.items.map(item => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                              <Link key={item.id} href={item.href}>
                                <Button
                                  variant={isActive ? 'default' : 'ghost'}
                                  className={cn(
                                    'justify-start h-10 w-full gap-3',
                                    isActive
                                      ? 'bg-[hsl(var(--rpma-teal))] text-black hover:bg-[hsl(var(--rpma-teal))]/90'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-border/20',
                                  )}
                                >
                                  <Icon className="h-4 w-4 shrink-0" />
                                  {item.label}
                                </Button>
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Page content */}
              <main className="flex-1 overflow-auto p-6">
                {children}
              </main>

            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
