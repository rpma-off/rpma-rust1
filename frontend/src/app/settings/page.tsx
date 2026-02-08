'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';

// Lazy load tab components to reduce initial bundle size
const ProfileSettingsTab = dynamic(() => import('@/components/settings/ProfileSettingsTab').then(mod => ({ default: mod.ProfileSettingsTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const PreferencesTab = dynamic(() => import('@/components/settings/PreferencesTab').then(mod => ({ default: mod.PreferencesTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const SecurityTab = dynamic(() => import('@/components/settings/SecurityTab').then(mod => ({ default: mod.SecurityTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const PerformanceTab = dynamic(() => import('@/components/settings/PerformanceTab').then(mod => ({ default: mod.PerformanceTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const AccessibilityTab = dynamic(() => import('@/components/settings/AccessibilityTab').then(mod => ({ default: mod.AccessibilityTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const NotificationsTab = dynamic(() => import('@/components/settings/NotificationsTab').then(mod => ({ default: mod.NotificationsTab })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

// Tab configuration
const tabConfig = [
  {
    id: 'profile',
    label: 'Profil',
    icon: User
  },
  {
    id: 'preferences',
    label: 'Préférences',
    icon: Bell
  },
  {
    id: 'security',
    label: 'Sécurité',
    icon: Shield
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: Zap
  },
  {
    id: 'accessibility',
    label: 'Accessibilité',
    icon: Eye
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell
  }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, profile, loading: authLoading } = useAuth();

  // Initialize logging
  const { logInfo, logError, logUserAction, logPerformance } = useLogger({
    context: LogDomain.USER,
    component: 'SettingsPage',
    enablePerformanceLogging: true
  });

  // Log page load (run once on mount only)
  useEffect(() => {
    const timer = logPerformance('Settings page load');
    logInfo('Settings page loaded', {
      initialTab: activeTab,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      userId: user?.user_id,
      hasProfile: !!profile
    });

    timer();
  }, []);

  // Keyboard navigation (listener doesn't depend on activeTab)
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
  }, [logUserAction]);

  const handleTabChange = (newTab: string) => {
    logUserAction('Tab changed', {
      fromTab: activeTab,
      toTab: newTab,
      method: 'click'
    });
    setActiveTab(newTab);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--rpma-surface))]">
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <PageHeader
          title="Paramètres"
          subtitle="Gérez vos paramètres de compte et préférences"
          icon={<Settings className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />}
          actions={
            <>
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
        />

        {/* Main Settings Card */}
        <Card className="rpma-shell">
          <CardHeader className="pb-4 border-b border-[hsl(var(--rpma-border))]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[hsl(var(--rpma-teal))]/20 rounded-lg">
                <User className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Paramètres personnels</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configurez vos informations personnelles, préférences et paramètres de sécurité
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
                           {activeTab === 'profile' && '1'}
                           {activeTab === 'preferences' && '2'}
                           {activeTab === 'security' && '3'}
                           {activeTab === 'performance' && '4'}
                           {activeTab === 'accessibility' && '5'}
                           {activeTab === 'notifications' && '6'}
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
                 <TabsContent value="profile" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-teal))] mx-auto mb-4"></div>
                         <p className="text-muted-foreground">Chargement du profil...</p>
                       </div>
                     </div>
                   }>
                     <ProfileSettingsTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="preferences" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-teal))] mx-auto mb-4"></div>
                         <p className="text-muted-foreground">Chargement des préférences...</p>
                       </div>
                     </div>
                   }>
                     <PreferencesTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="security" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-teal))] mx-auto mb-4"></div>
                         <p className="text-muted-foreground">Chargement de la sécurité...</p>
                       </div>
                     </div>
                   }>
                     <SecurityTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="performance" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-teal))] mx-auto mb-4"></div>
                         <p className="text-muted-foreground">Chargement des performances...</p>
                       </div>
                     </div>
                   }>
                     <PerformanceTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="accessibility" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-teal))] mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Chargement de l&apos;accessibilité...</p>
                       </div>
                     </div>
                   }>
                     <AccessibilityTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="notifications" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-teal))] mx-auto mb-4"></div>
                         <p className="text-muted-foreground">Chargement des notifications...</p>
                       </div>
                     </div>
                   }>
                     <NotificationsTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>
               </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
