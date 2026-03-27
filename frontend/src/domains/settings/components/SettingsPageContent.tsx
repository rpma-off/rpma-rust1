"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Bell, Building2, HelpCircle, Menu, Settings, Shield, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLogger } from "@/shared/hooks/useLogger";
import { LogDomain } from "@/shared/utils";
import { PageShell } from "@/shared/ui/layout/PageShell";
import { LoadingState } from "@/shared/ui/layout/LoadingState";
import { PageHeader } from "@/components/ui/page-header";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuth } from "@/shared/hooks/useAuth";
import { AppSettingsTab } from "./AppSettingsTab";

const ProfileSettingsTab = dynamic(() => import("./ProfileSettingsTab").then((mod) => ({ default: mod.ProfileSettingsTab })), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  ),
});

const PreferencesTab = dynamic(() => import("./PreferencesTab").then((mod) => ({ default: mod.PreferencesTab })), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  ),
});

const SecurityTab = dynamic(() => import("./SecurityTab").then((mod) => ({ default: mod.SecurityTab })), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  ),
});

const OrganizationSettingsTab = dynamic(() => import("./OrganizationSettingsTab").then((mod) => ({ default: mod.OrganizationSettingsTab })), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  ),
});

type TabId = "profile" | "preferences" | "security" | "organization" | "application";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  isConfig?: boolean;
}

const getTabConfig = (
  t: (key: string, params?: Record<string, string | number>) => string,
  isAdmin: boolean,
): TabConfig[] => {
  const all: TabConfig[] = [
    { id: "profile", label: t("nav.profile"), icon: User },
    { id: "preferences", label: t("settings.preferences"), icon: Bell },
    { id: "security", label: "Sécurité", icon: Shield },
    { id: "organization", label: "Atelier", icon: Building2, adminOnly: true },
    { id: "application", label: "Application", icon: Settings, adminOnly: true, isConfig: true },
  ];
  return all.filter((tab) => !tab.adminOnly || isAdmin);
};

export default function SettingsPageContent() {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const tabConfig = getTabConfig(t, isAdmin);
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const { logInfo, logUserAction, logPerformance } = useLogger({
    context: LogDomain.USER,
    component: "SettingsPage",
    enablePerformanceLogging: true,
  });

  useEffect(() => {
    const timer = logPerformance("Settings page load");
    logInfo("Settings page loaded", {
      initialTab: activeTab,
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userId: user?.user_id,
      hasProfile: !!profile,
    });
    timer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const tabIndex = tabConfig.findIndex((tab) => tab.id === activeTab);
      let newIndex = tabIndex;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          newIndex = tabIndex > 0 ? tabIndex - 1 : tabConfig.length - 1;
          break;
        case "ArrowRight":
          event.preventDefault();
          newIndex = tabIndex < tabConfig.length - 1 ? tabIndex + 1 : 0;
          break;
        default: {
          const num = parseInt(event.key);
          if (!isNaN(num) && num >= 1 && num <= tabConfig.length) {
            event.preventDefault();
            const tab = tabConfig[num - 1];
            if (tab) {
              logUserAction("Tab navigation via keyboard shortcut", {
                fromTab: activeTab,
                toTab: tab.id,
                shortcut: `Ctrl+${event.key}`,
              });
              setActiveTab(tab.id);
            }
            return;
          }
        }
      }

      const nextTab = tabConfig[newIndex];
      if (newIndex !== tabIndex && nextTab) {
        logUserAction("Tab navigation via keyboard", {
          fromTab: activeTab,
          toTab: nextTab.id,
          direction: event.key === "ArrowLeft" ? "previous" : "next",
        });
        setActiveTab(nextTab.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, logUserAction, tabConfig]);

  const handleTabChange = (newTab: string) => {
    logUserAction("Tab changed", {
      fromTab: activeTab,
      toTab: newTab,
      method: "click",
    });
    setActiveTab(newTab as TabId);
  };

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState message={t("common.loading")} />
      </PageShell>
    );
  }

  const tabCount = tabConfig.length;
  const userOnlyTabs = tabConfig.filter((tab) => !tab.isConfig);

  return (
    <PageShell>
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.account")}
        icon={<Settings className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />}
        actions={
          <>
            <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-border/20 rounded">1-{tabCount}</kbd>
              <span>{t("common.navigation").toLowerCase()}</span>
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
              <CardTitle className="text-lg font-semibold text-foreground">{t("settings.title")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("settings.account")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="lg:hidden mb-4">
              <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-between border-border/60 text-foreground hover:bg-border/20">
                      <div className="flex items-center">
                        <Menu className="h-4 w-4 mr-3" />
                        <span>{tabConfig.find((tab) => tab.id === activeTab)?.label ?? "Navigation"}</span>
                      </div>
                      <span className="text-muted-foreground text-sm">{tabConfig.findIndex((tab) => tab.id === activeTab) + 1}</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] bg-background border-[hsl(var(--rpma-border))]">
                    <SheetHeader className="text-left">
                      <SheetTitle className="text-foreground flex items-center gap-2"><Settings className="h-5 w-5" />Paramètres</SheetTitle>
                      <SheetDescription className="text-muted-foreground">Choisissez une section à configurer</SheetDescription>
                    </SheetHeader>
                    <div className="grid grid-cols-1 gap-2 mt-6">
                      {userOnlyTabs.map((tab, index) => {
                        const Icon = tab.icon;
                        return (
                          <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? "default" : "ghost"}
                            className={`justify-start h-12 ${activeTab === tab.id ? "bg-[hsl(var(--rpma-teal))] text-black hover:bg-[hsl(var(--rpma-teal))]/90" : "text-muted-foreground hover:text-foreground hover:bg-border/20"}`}
                            onClick={() => handleTabChange(tab.id)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center"><Icon className="h-4 w-4 mr-3" />{tab.label}</div>
                              <span className="text-xs opacity-60">{index + 1}</span>
                            </div>
                          </Button>
                        );
                      })}
                      {isAdmin && (
                        <>
                          <div className="border-t border-[hsl(var(--rpma-border))] my-2 pt-2">
                            <p className="text-xs text-muted-foreground px-1 mb-2 font-medium uppercase tracking-wide">Configuration</p>
                          </div>
                          {tabConfig.filter((tab) => tab.isConfig).map((tab, index) => {
                            const Icon = tab.icon;
                            return (
                              <Button
                                key={tab.id}
                                variant={activeTab === tab.id ? "default" : "ghost"}
                                className={`justify-start h-12 ${activeTab === tab.id ? "bg-[hsl(var(--rpma-teal))] text-black hover:bg-[hsl(var(--rpma-teal))]/90" : "text-muted-foreground hover:text-foreground hover:bg-border/20"}`}
                                onClick={() => handleTabChange(tab.id)}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center"><Icon className="h-4 w-4 mr-3" />{tab.label}</div>
                                  <span className="text-xs opacity-60">{userOnlyTabs.length + index + 1}</span>
                                </div>
                              </Button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="hidden lg:block bg-[hsl(var(--rpma-teal))] rounded-[10px] px-2">
              <TabsList data-variant="underline" className="w-full justify-start">
                {userOnlyTabs.map((tab, index) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} data-variant="underline" className="flex items-center gap-2 font-medium relative">
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      <span className="absolute -top-1 -right-1 text-xs bg-border/40 text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-60">{index + 1}</span>
                    </TabsTrigger>
                  );
                })}
                {isAdmin && (
                  <>
                    <div className="h-6 w-px bg-white/30 mx-1 self-center" />
                    {tabConfig.filter((tab) => tab.isConfig).map((tab, index) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger key={tab.id} value={tab.id} data-variant="underline" className="flex items-center gap-2 font-medium relative">
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                          <span className="absolute -top-1 -right-1 text-xs bg-border/40 text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-60">{userOnlyTabs.length + index + 1}</span>
                        </TabsTrigger>
                      );
                    })}
                  </>
                )}
              </TabsList>
            </div>

            <div className="mt-4 md:mt-6">
              <TabsContent value="profile" className="mt-0" forceMount>
                <Suspense fallback={<LoadingState message="Chargement du profil..." />}>
                  <ProfileSettingsTab user={user ?? undefined} profile={profile ?? undefined} />
                </Suspense>
              </TabsContent>

              <TabsContent value="preferences" className="mt-0" forceMount>
                <Suspense fallback={<LoadingState message="Chargement des préférences..." />}>
                  <PreferencesTab user={user ?? undefined} profile={profile ?? undefined} />
                </Suspense>
              </TabsContent>

              <TabsContent value="security" className="mt-0" forceMount>
                <Suspense fallback={<LoadingState message="Chargement de la sécurité..." />}>
                  {user ? <SecurityTab user={user} /> : <LoadingState message="Chargement..." />}
                </Suspense>
              </TabsContent>

              {isAdmin && (
                <TabsContent value="organization" className="mt-0" forceMount>
                  <Suspense fallback={<LoadingState message="Chargement de l'atelier..." />}>
                    <OrganizationSettingsTab />
                  </Suspense>
                </TabsContent>
              )}

              {isAdmin && (
                <TabsContent value="application" className="mt-0" forceMount>
                  <Suspense fallback={<LoadingState message="Chargement des paramètres applicatifs..." />}>
                    <AppSettingsTab />
                  </Suspense>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </PageShell>
  );
}
