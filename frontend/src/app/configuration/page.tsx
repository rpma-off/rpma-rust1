'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Settings, 
  Workflow, 
  Shield, 
  Globe, 
  Zap, 
  Activity,
  HelpCircle,
  RefreshCw,
  CheckCircle,
   AlertTriangle,
   Menu
} from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { PageShell } from '@/components/layout/PageShell';
import { LoadingState } from '@/components/layout/LoadingState';
import { PageHeader, StatCard } from '@/components/ui/page-header';

// Lazy load tab components to reduce initial bundle size
const SystemSettingsTab = dynamic(() => import('./components/SystemSettingsTab').then(mod => ({ default: mod.SystemSettingsTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const BusinessRulesTab = dynamic(() => import('./components/BusinessRulesTab').then(mod => ({ default: mod.BusinessRulesTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const SecurityPoliciesTab = dynamic(() => import('./components/SecurityPoliciesTab').then(mod => ({ default: mod.SecurityPoliciesTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const IntegrationsTab = dynamic(() => import('./components/IntegrationsTab').then(mod => ({ default: mod.IntegrationsTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});
import { PerformanceTab } from './components/PerformanceTab';
import { MonitoringTab } from './components/MonitoringTab';

// Tab configuration
const tabConfig = [
  {
    id: 'system',
    label: 'Système',
    icon: Settings
  },
  {
    id: 'business',
    label: 'Règles',
    icon: Workflow
  },
  {
    id: 'security',
    label: 'Sécurité',
    icon: Shield
  },
  {
    id: 'integrations',
    label: 'Intégrations',
    icon: Globe
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: Zap
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: Activity
  }
];

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState('system');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');
  
  // Initialize logging
  const { logInfo, logError, logUserAction, logPerformance } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'ConfigurationPage',
    enablePerformanceLogging: true
  });

  // Log page load
  useEffect(() => {
    logInfo('Configuration page loaded', {
      initialTab: activeTab,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }, [logInfo, activeTab]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const tabIndex = tabConfig.findIndex(tab => tab.id === activeTab);
        let newIndex = tabIndex;

        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            newIndex = tabIndex > 0 ? tabIndex - 1 : tabConfig.length - 1;
            break;
          case 'ArrowRight':
            event.preventDefault();
            newIndex = tabIndex < tabConfig.length - 1 ? tabIndex + 1 : 0;
            break;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
            event.preventDefault();
            newIndex = parseInt(event.key) - 1;
            if (newIndex < tabConfig.length) {
              if (tabConfig[newIndex]) {
                logUserAction('Tab navigation via keyboard shortcut', {
                  fromTab: activeTab,
                  toTab: tabConfig[newIndex].id,
                  shortcut: `Ctrl+${event.key}`
                });
                setActiveTab(tabConfig[newIndex].id);
              } else {
                console.warn('Invalid tab index:', newIndex);
              }
            }
            return;
        }

        if (newIndex !== tabIndex && tabConfig[newIndex]) {
          logUserAction('Tab navigation via keyboard', {
            fromTab: activeTab,
            toTab: tabConfig[newIndex]?.id,
            direction: event.key === 'ArrowLeft' ? 'previous' : 'next'
          });
          setActiveTab(tabConfig[newIndex]?.id);
        } else if (newIndex !== tabIndex) {
          console.warn('Invalid tab index:', newIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, logUserAction]);

  // Simulate system status check
  useEffect(() => {
    const checkSystemStatus = async () => {
      const timer = logPerformance('System status check');
      try {
        logInfo('Checking system status');
        const response = await fetch('/api/admin/configuration/status');
        if (response.ok) {
          const status = await response.json();
          const newStatus = status.overall === 'healthy' ? 'healthy' : 'warning';
          setSystemStatus(newStatus);
          logInfo('System status updated', { status: newStatus, details: status });
        } else {
          logError('Failed to check system status', { status: response.status });
          setSystemStatus('error');
        }
      } catch (error) {
        logError('System status check failed', { error: error instanceof Error ? error.message : error });
        setSystemStatus('error');
      } finally {
        timer();
      }
    };
    
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [logInfo, logError, logPerformance]);

  const handleRefresh = async () => {
    const timer = logPerformance('Page refresh');
    setIsRefreshing(true);
    logUserAction('Page refresh initiated');
    
    try {
      // Simulate refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      logInfo('Page refresh completed');
    } catch (error) {
      logError('Page refresh failed', { error: error instanceof Error ? error.message : error });
    } finally {
      setIsRefreshing(false);
      timer();
    }
  };

  const handleTabChange = (newTab: string) => {
    logUserAction('Tab changed', {
      fromTab: activeTab,
      toTab: newTab,
      method: 'click'
    });
    setActiveTab(newTab);
  };

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'healthy':
        return 'Système opérationnel';
      case 'warning':
        return 'Avertissements détectés';
      case 'error':
        return 'Erreurs détectées';
    }
  };

  return (
    <PageShell>
      {/* Header */}
      <PageHeader
        title="Configuration Avancée"
        subtitle="Gérez les paramètres système, les règles métier et les intégrations"
        icon={<Settings className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />}
        actions={
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--rpma-surface))] rounded-[6px] border border-[hsl(var(--rpma-border))]">
              {getStatusIcon()}
              <span className="text-sm font-medium text-foreground">{getStatusText()}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">1-6</kbd>
              <span>pour naviguer</span>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted/10">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </>
        }
        stats={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              value="24"
              label="Configurations"
              icon={Settings}
              color="accent"
            />
            <StatCard
              value="8"
              label="Règles Actives"
              icon={Workflow}
              color="green"
            />
            <StatCard
              value="5"
              label="Intégrations"
              icon={Globe}
              color="purple"
            />
            <StatCard
              value="2"
              label="Alertes"
              icon={AlertTriangle}
              color="yellow"
            />
          </div>
        }
      />

      {/* Main Configuration Card */}
      <Card className="rpma-shell">
        <CardHeader className="pb-4 border-b border-[hsl(var(--rpma-border))]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[hsl(var(--rpma-teal))]/20 rounded-lg">
              <Settings className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Configuration du Système</CardTitle>
              <CardDescription className="text-muted-foreground">
                Gérez tous les paramètres de configuration du système
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* Enhanced Mobile Navigation */}
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
                        Configuration
                      </SheetTitle>
                      <SheetDescription className="text-muted-foreground">
                        Sélectionnez une section à configurer
                      </SheetDescription>
                    </SheetHeader>
                    <div className="grid grid-cols-1 gap-2 mt-6">
                      {tabConfig.map((tab, index) => {
                        const Icon = tab.icon;
                        return (
                          <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? "default" : "ghost"}
                            className={`justify-start h-12 ${
                              activeTab === tab.id
                                ? 'bg-[hsl(var(--rpma-teal))] text-black hover:bg-[hsl(var(--rpma-teal))]/90'
                                : 'text-muted-foreground hover:text-foreground hover:bg-border/20'
                            }`}
                            onClick={() => handleTabChange(tab.id)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <Icon className="h-4 w-4 mr-3" />
                                {tab.label}
                              </div>
                              <span className="text-xs opacity-60">{index + 1}</span>
                            </div>
                          </Button>
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

            {/* Enhanced Desktop Tabs List */}
            <div className="hidden lg:block bg-[hsl(var(--rpma-teal))] rounded-[10px] px-2">
              <TabsList data-variant="underline" className="w-full justify-start">
                {tabConfig.map((tab, index) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      data-variant="underline"
                      className="flex items-center gap-2 font-medium relative"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      <span className="absolute -top-1 -right-1 text-xs bg-border/40 text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-60">
                        {index + 1}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="mt-4 md:mt-6">
              <TabsContent value="system" className="mt-0">
                <Suspense fallback={<LoadingState message="Chargement des paramètres système..." />}>
                  <SystemSettingsTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="business" className="mt-0">
                <Suspense fallback={<LoadingState message="Chargement des règles métier..." />}>
                  <BusinessRulesTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <Suspense fallback={<LoadingState message="Chargement des politiques de sécurité..." />}>
                  <SecurityPoliciesTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="integrations" className="mt-0">
                <Suspense fallback={<LoadingState message="Chargement des intégrations..." />}>
                  <IntegrationsTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="performance" className="mt-0">
                <Suspense fallback={<LoadingState message="Chargement des performances..." />}>
                  <PerformanceTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="monitoring" className="mt-0">
                <Suspense fallback={<LoadingState message="Chargement du monitoring..." />}>
                  <MonitoringTab />
                </Suspense>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </PageShell>
  );
}
