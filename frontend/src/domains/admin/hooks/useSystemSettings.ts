import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { SystemConfiguration, BusinessHoursConfig } from '@/shared/types';
import { settingsOperations } from '@/shared/utils';
import type { JsonValue, JsonObject } from '@/shared/types';
import { useAuth } from '@/shared/hooks/useAuth';

const inferDataType = (value: JsonValue): 'boolean' | 'number' | 'string' => {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
};

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
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

export function useSystemSettings() {
  const [configurations, setConfigurations] = useState<SystemConfiguration[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHoursConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { session } = useAuth();

  const loadConfigurations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsOperations.getAppSettings();
      const appSettings = data as Record<string, JsonValue>;
      const generalSettings = (appSettings?.general || {}) as Record<string, JsonValue>;
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
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast.error('Erreur lors du chargement des configurations');
    } finally {
      setLoading(false);
    }
  // session?.token triggers a re-fetch when the active session changes.
  // settingsOperations reads the session internally via the IPC layer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  const loadBusinessHours = useCallback(async () => {
    try {
      const data = await settingsOperations.getAppSettings();
      const appSettings = data as Record<string, JsonValue>;
      const stored = appSettings?.business_hours as unknown as BusinessHoursConfig | undefined;
      setBusinessHours(stored && stored.schedule ? stored : DEFAULT_BUSINESS_HOURS);
    } catch (error) {
      console.error('Error loading business hours:', error);
      setBusinessHours(DEFAULT_BUSINESS_HOURS);
    }
  // session?.token triggers a re-fetch when the active session changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) await loadConfigurations();
      if (!cancelled) await loadBusinessHours();
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [loadConfigurations, loadBusinessHours]);

  const updateConfiguration = (id: string, value: string | number | boolean) => {
    setConfigurations((prev) =>
      prev.map((configItem) => (configItem.id === id ? { ...configItem, value } : configItem)),
    );
    setHasChanges(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updateRequest: Record<string, string | number | boolean | undefined> = {};
      for (const config of configurations) {
        updateRequest[config.key] = config.value;
      }
      await settingsOperations.updateGeneralSettings(updateRequest as unknown as JsonObject);
      if (businessHours) {
        await settingsOperations.updateBusinessHours(businessHours as unknown as JsonObject);
      }
      toast.success('Configurations sauvegardées avec succès');
      setHasChanges(false);
    } catch (error) {
      toast.error(`Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      await loadConfigurations();
      await loadBusinessHours();
      setHasChanges(false);
    } finally {
      setResetting(false);
    }
  };

  return {
    configurations,
    businessHours,
    loading,
    saving,
    resetting,
    hasChanges,
    loadConfigurations,
    loadBusinessHours,
    save,
    reset,
    updateConfiguration,
    setBusinessHours,
    setHasChanges,
  };
}
