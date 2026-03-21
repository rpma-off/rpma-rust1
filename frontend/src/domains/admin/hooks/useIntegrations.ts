import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { settingsOperations } from '@/shared/utils';
import type { JsonValue } from '@/shared/types';
import { IntegrationConfig } from '@/shared/types';
import { useAuth } from '@/shared/hooks/useAuth';

export function useIntegrations() {
  const { session } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsOperations.getAppSettings();
      const appSettings = data as Record<string, JsonValue>;
      const configs = (appSettings?.integrations || []) as unknown as IntegrationConfig[];
      setIntegrations(Array.isArray(configs) ? configs : []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Erreur lors du chargement des intégrations');
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, session?.token]);

  const persistIntegrations = useCallback(
    async (nextIntegrations: IntegrationConfig[], successMessage: string) => {
      setSaving(true);
      try {
        await settingsOperations.updateGeneralSettings({
          integrations: nextIntegrations as unknown as JsonValue,
        } as Record<string, JsonValue>);
        toast.success(successMessage);
        await refresh();
      } catch (error) {
        console.error('Error saving integrations:', error);
        toast.error('Erreur lors de la sauvegarde');
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  return {
    integrations,
    loading,
    saving,
    refresh,
    persistIntegrations,
  };
}
