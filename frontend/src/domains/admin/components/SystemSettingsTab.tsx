'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Switch } from '@/shared/ui/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Skeleton } from '@/shared/ui/ui/skeleton';
import { Alert } from '@/shared/ui/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';
import { toast } from 'sonner';
import { useLogger, useFormLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/shared/utils';
import { motion } from 'framer-motion';
import {
  Settings,
  Clock,
  Globe,
  Bell,
  Save,
  RefreshCw,
  AlertTriangle,
  Info,
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Timer,
  Languages,
} from 'lucide-react';
import { SystemConfiguration, BusinessHoursConfig } from '@/shared/types';
import { useAuth } from '@/domains/auth';
import { settingsOperations } from '@/shared/utils';
import type { JsonValue, JsonObject } from '@/shared/types';

const ConfigurationSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
);

const BusinessHoursSkeleton = () => (
  <div className="space-y-4">
    {[...Array(7)].map((_, i) => (
      <div key={i} className="flex items-center justify-between p-4 border border-[hsl(var(--rpma-border))] rounded-lg">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
    ))}
  </div>
);

const EmptyConfigState = ({ message }: { message: string }) => (
  <div className="col-span-full rounded-lg border border-dashed border-[hsl(var(--rpma-border))] p-6 text-center">
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

export function SystemSettingsTab() {
  const [configurations, setConfigurations] = useState<SystemConfiguration[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHoursConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  const { session } = useAuth();

  const { logInfo, logError, logPerformance } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'SystemSettingsTab',
    enablePerformanceLogging: true,
  });

  const { logFormEvent, logFormSubmit } = useFormLogger('SystemSettings');

  const logInfoRef = useRef(logInfo);
  const logErrorRef = useRef(logError);
  const logPerformanceRef = useRef(logPerformance);
  logInfoRef.current = logInfo;
  logErrorRef.current = logError;
  logPerformanceRef.current = logPerformance;

  const loadConfigurations = useCallback(async () => {
    const timer = logPerformanceRef.current('Load configurations');
    try {
      setLoading(true);
      logInfoRef.current('Loading system configurations');

      const sessionToken = session?.token || '';
      const data = await settingsOperations.getAppSettings(sessionToken);
      const appSettings = data as Record<string, JsonValue>;
      const generalSettings = (appSettings?.general || {}) as Record<string, JsonValue>;
      const inferDataType = (value: JsonValue): 'boolean' | 'number' | 'string' => {
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        return 'string';
      };

      const configs: SystemConfiguration[] = Object.entries(generalSettings).map(([key, value]) => ({
        id: `general-${key}`,
        category: 'general',
        key,
        value: value as string | number | boolean,
        description: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        data_type: inferDataType(value),
        is_required: false,
        isRequired: false,
        system_level: true,
        created_at: '',
        updated_at: '',
      }));

      setConfigurations(configs);
      logInfoRef.current('System configurations loaded successfully via IPC', {
        count: configs.length,
        categories: ['general'],
      });
    } catch (error) {
      logErrorRef.current('Error loading configurations', { error: error instanceof Error ? error.message : error });
      toast.error('Erreur lors du chargement des configurations');
    } finally {
      setLoading(false);
      timer();
    }
  }, [session?.token]);

  const loadBusinessHours = useCallback(async () => {
    const timer = logPerformanceRef.current('Load business hours');
    try {
      logInfoRef.current('Loading business hours configuration');

      const defaultBusinessHours: BusinessHoursConfig = {
        enabled: true,
        timezone: 'Europe/Paris',
        schedule: {
          monday: { start: '08:00', end: '18:00', enabled: true },
          tuesday: { start: '08:00', end: '18:00', enabled: true },
          wednesday: { start: '08:00', end: '18:00', enabled: true },
          thursday: { start: '08:00', end: '18:00', enabled: true },
          friday: { start: '08:00', end: '18:00', enabled: true },
          saturday: { start: '09:00', end: '13:00', enabled: false },
          sunday: { start: '00:00', end: '00:00', enabled: false },
        },
      };
      setBusinessHours(defaultBusinessHours);
      logInfoRef.current('Business hours loaded successfully');
    } catch (error) {
      logErrorRef.current('Error loading business hours', { error: error instanceof Error ? error.message : error });
    } finally {
      timer();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) {
        await loadConfigurations();
      }
      if (!cancelled) {
        await loadBusinessHours();
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [loadConfigurations, loadBusinessHours]);

  const updateConfiguration = (id: string, value: string | number | boolean) => {
    const config = configurations.find((c) => c.id === id);
    logFormEvent('Configuration updated', {
      configId: id,
      configKey: config?.key,
      oldValue: config?.value,
      newValue: value,
      configType: config?.data_type,
    });

    setConfigurations((prev) => prev.map((configItem) => (configItem.id === id ? { ...configItem, value } : configItem)));
    setHasChanges(true);
  };

  const saveConfigurations = async () => {
    const timer = logPerformanceRef.current('Save configurations');
    setSaving(true);
    logFormEvent('Save configurations initiated', { configurationsCount: configurations.length });

    try {
      const sessionToken = session?.token || '';
      logInfoRef.current('Saving configurations via IPC', { count: configurations.length });

      const updateRequest: Record<string, string | number | boolean | undefined> = {};
      for (const config of configurations) {
        updateRequest[config.key] = config.value;
      }

      await settingsOperations.updateGeneralSettings(updateRequest as unknown as JsonObject, sessionToken);

      logFormSubmit(configurations, true);
      toast.success('Configurations sauvegardées avec succès');
      setHasChanges(false);
      logInfoRef.current('Configurations saved successfully', { count: configurations.length });
    } catch (error) {
      logFormSubmit(configurations, false, error);
      logErrorRef.current('Error saving configurations', { error: error instanceof Error ? error.message : error });
      toast.error(`Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
      timer();
    }
  };

  const resetChanges = async () => {
    setResetting(true);
    try {
      await loadConfigurations();
      await loadBusinessHours();
      setHasChanges(false);
    } finally {
      setResetting(false);
    }
  };

  const renderConfigurationField = (config: SystemConfiguration) => {
    const onChange = (e: React.ChangeEvent<HTMLInputElement> | string | number | boolean) =>
      updateConfiguration(config.id, typeof e === 'object' && 'target' in e ? e.target?.value : e);

    switch (config.data_type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.data_type === 'boolean' ? Boolean(config.value) : false}
              onCheckedChange={(checked) => updateConfiguration(config.id, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {config.data_type === 'boolean' ? (Boolean(config.value) ? 'Activé' : 'Désactivé') : 'N/A'}
            </span>
          </div>
        );
      case 'number':
        return (
          <Input
            value={typeof config.value === 'number' ? config.value : Number(config.value) || 0}
            onChange={onChange}
            className="transition-colors"
            type="number"
            placeholder="Entrez une valeur numérique"
          />
        );
      case 'json':
        return (
          <div className="space-y-2">
            <Textarea
              value={JSON.stringify(config.value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateConfiguration(config.id, parsed);
                } catch {
                  // Invalid JSON while user is typing.
                }
              }}
              className="font-mono text-sm"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Format JSON valide requis</p>
          </div>
        );
      default:
        return (
          <Input
            value={typeof config.value === 'string' ? config.value : String(config.value || '')}
            onChange={onChange}
            className="transition-colors"
            type={config.key.toLowerCase().includes('password') ? 'password' : 'text'}
            placeholder={`Entrez ${config.description?.toLowerCase() || 'une valeur'}`}
          />
        );
    }
  };

  const subTabs = [
    {
      id: 'general',
      label: 'Général',
      icon: Settings,
      description: "Paramètres de base de l'entreprise",
    },
    {
      id: 'business-hours',
      label: "Heures d'ouverture",
      icon: Clock,
      description: 'Configuration des horaires de travail',
    },
    {
      id: 'localization',
      label: 'Localisation',
      icon: Globe,
      description: 'Langue, fuseau horaire et format',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Préférences de notification',
    },
  ];

  const companyConfigurations = configurations.filter((config) =>
    ['company_name', 'company_email', 'company_phone', 'company_address'].includes(config.key)
  );
  const localizationConfigurations = configurations.filter((config) =>
    ['timezone', 'language', 'date_format', 'currency'].includes(config.key)
  );
  const notificationConfigurations = configurations.filter((config) => config.key.includes('notification'));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <ConfigurationSkeleton />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold text-foreground">Paramètres Système</h2>
            <p className="text-muted-foreground mt-1">Configurez les paramètres généraux de votre système</p>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Alert className="flex items-center gap-2 py-2 border-yellow-300 text-yellow-800 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Modifications non sauvegardées</span>
              </Alert>
            )}

            <Button
              variant="outline"
              onClick={resetChanges}
              disabled={!hasChanges || saving || resetting}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
              {resetting ? 'Réinitialisation...' : 'Annuler'}
            </Button>

            <Button onClick={saveConfigurations} disabled={!hasChanges || saving || resetting} className="flex items-center gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </Button>
          </div>
        </motion.div>

        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-lg">
            {subTabs.map((tab) => {
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
                  </div>
                  <span className="text-xs text-muted-foreground hidden md:block text-center">{tab.description}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    Informations de l&apos;Entreprise
                  </CardTitle>
                  <CardDescription>Configurez les informations de base de votre entreprise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {companyConfigurations.map((config) => (
                      <motion.div
                        key={config.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                      >
                        <Label htmlFor={config.id} className="flex items-center gap-2">
                          {config.key === 'company_name' && <Building2 className="h-4 w-4" />}
                          {config.key === 'company_email' && <Mail className="h-4 w-4" />}
                          {config.key === 'company_phone' && <Phone className="h-4 w-4" />}
                          {config.key === 'company_address' && <MapPin className="h-4 w-4" />}
                          {config.description}
                          {config.isRequired && <span className="text-red-500" aria-label="Champ obligatoire">*</span>}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Configuration: {config.key}</p>
                              <p>Type: {config.data_type}</p>
                              {config.isRequired && <p>Ce champ est obligatoire</p>}
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        {renderConfigurationField(config)}
                        {config.isEncrypted && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            Valeur chiffrée
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {companyConfigurations.length === 0 && (
                      <EmptyConfigState message="Aucun paramètre d'entreprise disponible." />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="business-hours" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    Heures d&apos;Ouverture
                  </CardTitle>
                  <CardDescription>Définissez les heures de travail pour votre entreprise</CardDescription>
                </CardHeader>
                <CardContent>
                  {businessHours ? (
                    <div className="space-y-4">
                      {Object.entries(businessHours.schedule).map(([day, hours]) => (
                        <motion.div
                          key={day}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between p-4 border border-[hsl(var(--rpma-border))] rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium capitalize">{day}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{hours.enabled ? `${hours.start} - ${hours.end}` : 'Fermé'}</span>
                            </div>
                            <Switch
                              checked={hours.enabled}
                              onCheckedChange={(enabled) => {
                                setBusinessHours((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    schedule: {
                                      ...prev.schedule,
                                      [day]: { ...hours, enabled },
                                    },
                                  };
                                });
                                setHasChanges(true);
                              }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <BusinessHoursSkeleton />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="localization" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    Localisation
                  </CardTitle>
                  <CardDescription>Configurez la langue, le fuseau horaire et les formats</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {localizationConfigurations.map((config) => (
                      <motion.div
                        key={config.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                      >
                        <Label htmlFor={config.id} className="flex items-center gap-2">
                          {config.key === 'timezone' && <Clock className="h-4 w-4" />}
                          {config.key === 'language' && <Languages className="h-4 w-4" />}
                          {config.key === 'date_format' && <Calendar className="h-4 w-4" />}
                          {config.key === 'currency' && <span className="text-lg">€</span>}
                          {config.description}
                        </Label>
                        {renderConfigurationField(config)}
                      </motion.div>
                    ))}
                    {localizationConfigurations.length === 0 && (
                      <EmptyConfigState message="Aucun paramètre de localisation disponible." />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    Notifications
                  </CardTitle>
                  <CardDescription>Configurez les préférences de notification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {notificationConfigurations.map((config) => (
                      <motion.div
                        key={config.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                      >
                        <Label htmlFor={config.id} className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          {config.description}
                        </Label>
                        {renderConfigurationField(config)}
                      </motion.div>
                    ))}
                    {notificationConfigurations.length === 0 && (
                      <EmptyConfigState message="Aucun paramètre de notification disponible." />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

