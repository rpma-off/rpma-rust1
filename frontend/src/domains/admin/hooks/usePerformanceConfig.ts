import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PerformanceConfig, PerformanceCategory, CreatePerformanceConfigDTO } from '@/shared/types';
import { useAuth } from '@/domains/auth';
import { settingsOperations } from '@/shared/utils';
import type { JsonValue } from '@/shared/types';

const DEFAULT_FORM_DATA: CreatePerformanceConfigDTO = {
  category: 'caching' as PerformanceCategory,
  name: '',
  value: null,
  isActive: true,
  settings: {
    enabled: true,
    ttlSeconds: 3600,
    maxSizeMb: 100,
    strategy: 'lru' as const,
    connectionPoolSize: 10,
    queryTimeoutSeconds: 30,
    maxConnections: 100,
    compressionEnabled: true,
    rateLimitPerHour: 1000,
    timeoutSeconds: 30
  },
  thresholds: {
    queryTimeThreshold: { value: 200, unit: 'ms' },
    connectionUsageThreshold: { value: 80, unit: 'percent' },
    hitRateThreshold: { value: 85, unit: 'percent' },
    missRateThreshold: { value: 15, unit: 'percent' },
    uploadTimeThreshold: { value: 30, unit: 'seconds' },
    fileSizeThreshold: { value: 10, unit: 'mb' }
  },
  monitoring: {
    enabled: true,
    interval: 60,
    intervalSeconds: 60,
    retention_days: 30,
    metrics: ['response_time', 'cpu_usage', 'memory_usage', 'error_rate']
  },
  alerts: [
    {
      metric: 'cpu_usage',
      threshold: 80,
      action: 'alert' as const,
      recipients: ['admin@company.com']
    },
    {
      metric: 'memory_usage',
      threshold: 85,
      action: 'email' as const,
      recipients: ['admin@company.com']
    }
  ]
};

export function usePerformanceConfig() {
  const [performanceConfigs, setPerformanceConfigs] = useState<PerformanceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PerformanceConfig | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('caching');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<PerformanceConfig | null>(null);
  const { session } = useAuth();

  const [formData, setFormData] = useState<CreatePerformanceConfigDTO>({ ...DEFAULT_FORM_DATA });

  const loadPerformanceConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const sessionToken = session?.token || '';
      const data = await settingsOperations.getAppSettings(sessionToken);
      const appSettings = data as Record<string, JsonValue>;
      const configs = (appSettings?.performance_configs || []) as unknown as PerformanceConfig[];
      setPerformanceConfigs(Array.isArray(configs) ? configs : []);
    } catch (error) {
      console.error('Error loading performance configs:', error);
      toast.error('Erreur lors du chargement des configurations de performance');
      setPerformanceConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    loadPerformanceConfigs();
  }, [loadPerformanceConfigs]);

  const savePerformanceConfig = async () => {
    setSaving(true);
    try {
      const sessionToken = session?.token || '';
      const newConfig: PerformanceConfig = {
        id: editingConfig?.id || crypto.randomUUID(),
        category: formData.category,
        name: formData.name,
        value: formData.value,
        isActive: formData.isActive,
        settings: formData.settings,
        thresholds: formData.thresholds,
        monitoring: formData.monitoring,
        alerts: formData.alerts,
        createdAt: editingConfig?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let updatedConfigs: PerformanceConfig[];
      if (editingConfig) {
        updatedConfigs = performanceConfigs.map(c => c.id === editingConfig.id ? newConfig : c);
      } else {
        updatedConfigs = [...performanceConfigs, newConfig];
      }

      await settingsOperations.updateGeneralSettings(
        { performance_configs: updatedConfigs as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );

      toast.success(editingConfig ? 'Configuration mise à jour avec succès' : 'Configuration créée avec succès');
      setShowCreateDialog(false);
      setEditingConfig(null);
      resetForm();
      await loadPerformanceConfigs();
    } catch (error) {
      console.error('Error saving performance config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deletePerformanceConfig = async () => {
    if (!configToDelete) return;
    try {
      const sessionToken = session?.token || '';
      const updatedConfigs = performanceConfigs.filter((config) => config.id !== configToDelete.id);
      await settingsOperations.updateGeneralSettings(
        { performance_configs: updatedConfigs as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success('Configuration supprimée avec succès');
      await loadPerformanceConfigs();
    } catch (error) {
      console.error('Error deleting performance config:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteConfirmOpen(false);
      setConfigToDelete(null);
    }
  };

  const confirmDeletePerformanceConfig = (config: PerformanceConfig) => {
    setConfigToDelete(config);
    setDeleteConfirmOpen(true);
  };

  const toggleConfigStatus = async (config: PerformanceConfig) => {
    try {
      const sessionToken = session?.token || '';
      const updatedConfigs = performanceConfigs.map(c =>
        c.id === config.id ? { ...c, isActive: !c.isActive } : c
      );
      await settingsOperations.updateGeneralSettings(
        { performance_configs: updatedConfigs as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success(`Configuration ${config.isActive ? 'désactivée' : 'activée'} avec succès`);
      await loadPerformanceConfigs();
    } catch (error) {
      console.error('Error updating config status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM_DATA });
  };

  const openEditDialog = (config: PerformanceConfig) => {
    setEditingConfig(config);
    setFormData({
      category: config.category as PerformanceCategory,
      name: config.name,
      value: config.value,
      isActive: config.isActive,
      settings: { ...DEFAULT_FORM_DATA.settings, ...config.settings },
      thresholds: { ...DEFAULT_FORM_DATA.thresholds, ...config.thresholds },
      monitoring: {
        enabled: config.monitoring?.enabled ?? true,
        interval: config.monitoring?.interval ?? 60,
        intervalSeconds: config.monitoring?.intervalSeconds ?? 60,
        retention_days: config.monitoring?.retention_days ?? 30,
        metrics: config.monitoring?.metrics ?? ['response_time']
      },
      alerts: config.alerts || []
    });
    setShowCreateDialog(true);
  };

  return {
    performanceConfigs,
    loading,
    saving,
    showCreateDialog,
    setShowCreateDialog,
    editingConfig,
    setEditingConfig,
    activeSubTab,
    setActiveSubTab,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    configToDelete,
    formData,
    setFormData,
    savePerformanceConfig,
    deletePerformanceConfig,
    confirmDeletePerformanceConfig,
    toggleConfigStatus,
    resetForm,
    openEditDialog,
  };
}
