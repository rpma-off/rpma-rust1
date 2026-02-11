'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/components/ui/animations';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { PageShell } from '@/components/layout/PageShell';

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

// Tab configuration with enhanced metadata
const tabConfig = [
  {
    id: 'system',
    label: 'Système',
    icon: Settings,
    description: 'Paramètres généraux et configuration de base',
    color: 'blue',
    badge: null
  },
  {
    id: 'business',
    label: 'Règles',
    icon: Workflow,
    description: 'Règles métier et automatisation',
    color: 'green',
    badge: null
  },
  {
    id: 'security',
    label: 'Sécurité',
    icon: Shield,
    description: 'Politiques de sécurité et accès',
    color: 'red',
    badge: null
  },
  {
    id: 'integrations',
    label: 'Intégrations',
    icon: Globe,
    description: 'Services externes et API',
    color: 'purple',
    badge: null
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: Zap,
    description: 'Optimisation et monitoring',
    color: 'yellow',
    badge: null
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: Activity,
    description: 'Surveillance système en temps réel',
    color: 'indigo',
    badge: null
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
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-8"
      >
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-4xl font-semibold text-foreground">
                Configuration Avancée
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl">
              Gérez les paramètres système, les règles métier et les intégrations avec une interface intuitive et moderne
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* System Status */}
            <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg shadow-sm border">
              {getStatusIcon()}
              <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
            </div>
            
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </motion.div>

                {/* Quick Stats */}
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Configurations', value: '24', icon: Settings, color: 'blue' },
            { label: 'Règles Actives', value: '8', icon: Workflow, color: 'green' },
            { label: 'Intégrations', value: '5', icon: Globe, color: 'purple' },
            { label: 'Alertes', value: '2', icon: AlertTriangle, color: 'yellow' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              variants={staggerItem}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <motion.p 
                        className="text-2xl font-bold text-gray-900"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                      >
                        {stat.value}
                      </motion.p>
        </div>
                    <motion.div 
                      className={`p-2 rounded-lg bg-${stat.color}-100`}
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                    </motion.div>
      </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Main Configuration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Configuration du Système
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Gérez tous les paramètres de configuration du système avec une interface moderne et intuitive
          </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500">
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">1-6</kbd>
                    <span>pour naviguer</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
        </CardHeader>
        <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {/* Mobile Navigation */}
                <div className="lg:hidden mb-4">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Menu className="h-4 w-4 mr-2" />
                        {tabConfig.find(tab => tab.id === activeTab)?.label || 'Navigation'}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[80vh]">
                      <SheetHeader>
                        <SheetTitle>Configuration du Système</SheetTitle>
                        <SheetDescription>
                          Sélectionnez une section à configurer
                        </SheetDescription>
                      </SheetHeader>
                      <div className="grid grid-cols-1 gap-2 mt-6">
                        {tabConfig.map((tab) => {
                          const Icon = tab.icon;
                          return (
                            <Button
                              key={tab.id}
                              variant={activeTab === tab.id ? "default" : "ghost"}
                              className="justify-start h-auto p-4"
                              onClick={() => handleTabChange(tab.id)}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-muted/20' : 'bg-muted'}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                  <div className="font-medium">{tab.label}</div>
                                  <div className="text-xs opacity-70">{tab.description}</div>
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Desktop Tabs List */}
                <TabsList className="hidden lg:grid w-full grid-cols-6 h-auto p-1 bg-gray-100 rounded-lg">
                  {tabConfig.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{tab.label}</span>
                          {tab.badge && (
                            <Badge variant="secondary" className="ml-1">
                              {tab.badge}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 text-center">
                          {tab.description}
                        </span>
              </TabsTrigger>
                    );
                  })}
            </TabsList>

                {/* Enhanced Tab Content with Animations */}
                <div className="mt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TabsContent value="system" className="mt-0">
              <SystemSettingsTab />
            </TabsContent>

                      <TabsContent value="business" className="mt-0">
              <BusinessRulesTab />
            </TabsContent>

                      <TabsContent value="security" className="mt-0">
              <SecurityPoliciesTab />
            </TabsContent>

                      <TabsContent value="integrations" className="mt-0">
              <IntegrationsTab />
            </TabsContent>

                      <TabsContent value="performance" className="mt-0">
              <PerformanceTab />
            </TabsContent>

                      <TabsContent value="monitoring" className="mt-0">
              <MonitoringTab />
            </TabsContent>
                    </motion.div>
                  </AnimatePresence>
                </div>
          </Tabs>
        </CardContent>
      </Card>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
