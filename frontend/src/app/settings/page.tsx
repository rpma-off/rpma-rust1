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
    label: 'Profile',
    icon: User
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Bell
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: Zap
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
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

  // Log page load
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
  }, [logInfo, logPerformance, activeTab, user?.user_id, profile]);

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

  const handleTabChange = (newTab: string) => {
    logUserAction('Tab changed', {
      fromTab: activeTab,
      toTab: newTab,
      method: 'click'
    });
    setActiveTab(newTab);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-border/10 to-border/5 rounded-xl p-4 md:p-6 border border-border/20">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Settings className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">Paramètres</h1>
                  <p className="text-border-light text-sm md:text-base">
                    Gérez vos paramètres de compte et préférences
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-1 text-xs text-border-light bg-background/50 px-2 py-1 rounded">
                  <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">1-6</kbd>
                  <span>pour naviguer</span>
                </div>
                <Button variant="ghost" size="sm" className="text-border-light hover:text-foreground hover:bg-border/20">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Stats - Mobile */}
            <div className="block lg:hidden">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-background/50 rounded-lg border border-border/30">
                  <div className="text-lg font-bold text-foreground">6</div>
                  <div className="text-xs text-border-light">Sections</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg border border-border/30">
                  <div className="text-lg font-bold text-accent">Actif</div>
                  <div className="text-xs text-border-light">Profil</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg border border-border/30">
                  <div className="text-lg font-bold text-foreground">✓</div>
                  <div className="text-xs text-border-light">Sécurisé</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Main Settings Card */}
        <Card className="border-border/20 bg-border/5 shadow-xl">
          <CardHeader className="pb-4 border-b border-border/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Paramètres personnels</CardTitle>
                <CardDescription className="text-border-light">
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
                         <span className="text-border-light text-sm">
                           {activeTab === 'profile' && '1'}
                           {activeTab === 'preferences' && '2'}
                           {activeTab === 'security' && '3'}
                           {activeTab === 'performance' && '4'}
                           {activeTab === 'accessibility' && '5'}
                           {activeTab === 'notifications' && '6'}
                         </span>
                       </Button>
                     </SheetTrigger>
                     <SheetContent side="bottom" className="h-[70vh] bg-background border-border/20">
                       <SheetHeader className="text-left">
                         <SheetTitle className="text-foreground flex items-center gap-2">
                           <Settings className="h-5 w-5" />
                           Paramètres
                         </SheetTitle>
                         <SheetDescription className="text-border-light">
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
                                   ? 'bg-accent text-black hover:bg-accent/90'
                                   : 'text-border-light hover:text-foreground hover:bg-border/20'
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
                       <div className="mt-6 pt-4 border-t border-border/20">
                         <p className="text-xs text-border-light text-center">
                           Utilisez Ctrl+1-6 pour naviguer rapidement (desktop)
                         </p>
                       </div>
                     </SheetContent>
                   </Sheet>
                 </div>
               </div>

               {/* Enhanced Desktop Tabs List */}
               <TabsList className="hidden lg:grid w-full grid-cols-6 bg-border/20 border-border/30">
                 {tabConfig.map((tab, index) => {
                   const Icon = tab.icon;
                   return (
                     <TabsTrigger
                       key={tab.id}
                       value={tab.id}
                       className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-black font-medium relative"
                     >
                       <Icon className="h-4 w-4" />
                       <span>{tab.label}</span>
                       <span className="absolute -top-1 -right-1 text-xs bg-border/40 text-border-light rounded-full w-4 h-4 flex items-center justify-center opacity-60">
                         {index + 1}
                       </span>
                     </TabsTrigger>
                   );
                 })}
               </TabsList>

               {/* Tab Content */}
               <div className="mt-4 md:mt-6">
                 <TabsContent value="profile" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-border/5 rounded-lg border border-border/20">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                         <p className="text-border-light">Chargement du profil...</p>
                       </div>
                     </div>
                   }>
                     <ProfileSettingsTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="preferences" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-border/5 rounded-lg border border-border/20">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                         <p className="text-border-light">Chargement des préférences...</p>
                       </div>
                     </div>
                   }>
                     <PreferencesTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="security" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-border/5 rounded-lg border border-border/20">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                         <p className="text-border-light">Chargement de la sécurité...</p>
                       </div>
                     </div>
                   }>
                     <SecurityTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="performance" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-border/5 rounded-lg border border-border/20">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                         <p className="text-border-light">Chargement des performances...</p>
                       </div>
                     </div>
                   }>
                     <PerformanceTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="accessibility" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-border/5 rounded-lg border border-border/20">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                          <p className="text-border-light">Chargement de l&apos;accessibilité...</p>
                       </div>
                     </div>
                   }>
                     <AccessibilityTab user={user || undefined} profile={profile || undefined} />
                   </Suspense>
                 </TabsContent>

                 <TabsContent value="notifications" className="mt-0">
                   <Suspense fallback={
                     <div className="flex items-center justify-center p-8 bg-border/5 rounded-lg border border-border/20">
                       <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                         <p className="text-border-light">Chargement des notifications...</p>
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