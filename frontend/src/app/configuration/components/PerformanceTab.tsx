'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
// import { Slider } from '@/components/ui/slider'; // Component not available
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LoadingState } from '@/components/layout/LoadingState';
import { 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,

  Save,
  RefreshCw,
   Database,
   HardDrive,
   Activity,
  TrendingUp,
  Settings
} from 'lucide-react';
import { PerformanceConfig, PerformanceCategory, CreatePerformanceConfigDTO, PerformanceThreshold } from '@/types/configuration.types';
import { useAuth } from '@/contexts/AuthContext';
import { settingsOperations } from '@/lib/ipc/domains/settings';
import type { JsonValue } from '@/types/json';

export function PerformanceTab() {
  const [performanceConfigs, setPerformanceConfigs] = useState<PerformanceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PerformanceConfig | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('caching');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<PerformanceConfig | null>(null);
  const { session } = useAuth();

  // Form state for creating/editing performance configs
  const [formData, setFormData] = useState<CreatePerformanceConfigDTO>({
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
  });

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
    setFormData({
      category: 'caching',
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
    });
  };

  const openEditDialog = (config: PerformanceConfig) => {
    setEditingConfig(config);
    setFormData({
      category: config.category as PerformanceCategory,
      name: config.name,
      value: config.value,
      isActive: config.isActive,
      settings: { ...formData.settings, ...config.settings },
      thresholds: { ...formData.thresholds, ...config.thresholds },
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

  const getCategoryLabel = (category: PerformanceCategory) => {
    const labels: Record<PerformanceCategory, string> = {
      cache: 'Cache',
      caching: 'Cache',
      database: 'Base de données',
      network: 'Réseau',
      ui: 'Interface utilisateur',
      file_upload: 'Upload de fichiers',
      api: 'API',
      monitoring: 'Monitoring'
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: PerformanceCategory) => {
    switch (category) {
      case 'caching':
        return <Zap className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'file_upload':
        return <HardDrive className="h-4 w-4" />;
      case 'api':
        return <Activity className="h-4 w-4" />;
      case 'monitoring':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance</h2>
          <p className="text-gray-600">
            Gérez les paramètres de performance et d&apos;optimisation
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingConfig(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Modifier la Configuration' : 'Nouvelle Configuration de Performance'}
              </DialogTitle>
              <DialogDescription>
                Créez ou modifiez une configuration de performance pour optimiser votre système
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="config-category">Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as PerformanceCategory }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caching">Cache</SelectItem>
                      <SelectItem value="database">Base de données</SelectItem>
                      <SelectItem value="memory">Mémoire</SelectItem>
                      <SelectItem value="cpu">CPU</SelectItem>
                      <SelectItem value="network">Réseau</SelectItem>
                      <SelectItem value="storage">Stockage</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label>Configuration active</Label>
                </div>
              </div>

              {/* Configuration Settings */}
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="caching">Cache</TabsTrigger>
                  <TabsTrigger value="database">Base de données</TabsTrigger>
                  <TabsTrigger value="thresholds">Seuils</TabsTrigger>
                  <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                </TabsList>

                <TabsContent value="caching" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Cache activé</Label>
                      <Switch
                        checked={Boolean(formData.settings?.enabled) ?? true}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, enabled: checked }
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cache-ttl">TTL du cache (secondes)</Label>
                      <Input
                        id="cache-ttl"
                        type="number"
                        min="60"
                        max="86400"
                        value={String(formData.settings?.ttlSeconds ?? 3600)}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, ttlSeconds: parseInt(e.target.value) || 3600 }
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-cache-size">Taille max du cache (MB)</Label>
                      <Input
                        id="max-cache-size"
                        type="number"
                        min="10"
                        max="1000"
                        value={String(formData.settings?.maxSizeMb ?? 100)}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, maxSizeMb: parseInt(e.target.value) || 100 }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Compression activée</Label>
                      <Switch
                        checked={Boolean(formData.settings?.compressionEnabled) ?? true}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, compressionEnabled: checked }
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cache-strategy">Stratégie de cache</Label>
                      <Select
                        value={String(formData.settings?.strategy ?? 'lru')}
                        onValueChange={(value: 'lru' | 'fifo' | 'ttl') => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, strategy: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lru">LRU (Least Recently Used)</SelectItem>
                          <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                          <SelectItem value="ttl">TTL (Time To Live)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="database" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pool-size">Taille du pool de connexions</Label>
                      <Input
                        id="pool-size"
                        type="number"
                        min="5"
                        max="50"
                        value={String(formData.settings?.connectionPoolSize ?? 10)}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, connectionPoolSize: parseInt(e.target.value) || 10 }
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="query-timeout">Timeout des requêtes (secondes)</Label>
                      <Input
                        id="query-timeout"
                        type="number"
                        min="5"
                        max="300"
                        value={String(formData.settings?.queryTimeoutSeconds ?? 30)}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, queryTimeoutSeconds: parseInt(e.target.value) || 30 }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-connections">Connexions max</Label>
                    <Input
                      id="max-connections"
                      type="number"
                      min="10"
                      max="200"
                      value={String(formData.settings?.maxConnections ?? 100)}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, maxConnections: parseInt(e.target.value) || 100 }
                      }))}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="thresholds" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="query-time-threshold">Seuil temps de requête (ms)</Label>
                      <Input
                        id="query-time-threshold"
                        type="number"
                        min="50"
                        max="5000"
                         value={formData.thresholds?.queryTimeThreshold?.value ?? 1000}
                         onChange={(e) => setFormData(prev => ({
                           ...prev,
                           thresholds: { ...prev.thresholds, queryTimeThreshold: { value: parseInt(e.target.value) || 200, unit: 'ms' } }
                         }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="connection-usage-threshold">Seuil utilisation connexions (%)</Label>
                      <Input
                        id="connection-usage-threshold"
                        type="number"
                        min="50"
                        max="100"
                         value={formData.thresholds?.connectionUsageThreshold?.value ?? 80}
                         onChange={(e) => setFormData(prev => ({
                           ...prev,
                           thresholds: { ...prev.thresholds, connectionUsageThreshold: { value: parseInt(e.target.value) || 80, unit: 'percent' } }
                         }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hit-rate-threshold">Seuil taux de succès (%)</Label>
                      <Input
                        id="hit-rate-threshold"
                        type="number"
                        min="50"
                        max="100"
                         value={formData.thresholds?.hitRateThreshold?.value ?? 90}
                         onChange={(e) => setFormData(prev => ({
                           ...prev,
                           thresholds: { ...prev.thresholds, hitRateThreshold: { value: parseInt(e.target.value) || 85, unit: 'percent' } }
                         }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="miss-rate-threshold">Seuil taux d&apos;échec (%)</Label>
                      <Input
                        id="miss-rate-threshold"
                        type="number"
                        min="0"
                        max="50"
                         value={formData.thresholds?.missRateThreshold?.value ?? 10}
                         onChange={(e) => setFormData(prev => ({
                           ...prev,
                           thresholds: { ...prev.thresholds, missRateThreshold: { value: parseInt(e.target.value) || 15, unit: 'percent' } }
                         }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Monitoring activé</Label>
                    <Switch
                      checked={formData.monitoring?.enabled ?? true}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          monitoring: {
                            enabled: Boolean(checked),
                            interval: prev.monitoring?.interval ?? 60,
                            intervalSeconds: prev.monitoring?.intervalSeconds ?? 60,
                            retention_days: prev.monitoring?.retention_days ?? 30,
                            metrics: prev.monitoring?.metrics ?? ['response_time']
                          }
                        }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monitoring-interval">Intervalle de monitoring (secondes)</Label>
                      <Input
                        id="monitoring-interval"
                        type="number"
                        min="10"
                        max="3600"
                        value={formData.monitoring?.intervalSeconds ?? 60}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            monitoring: {
                              enabled: prev.monitoring?.enabled ?? true,
                              interval: prev.monitoring?.interval ?? 60,
                              intervalSeconds: parseInt(e.target.value) || 60,
                              retention_days: prev.monitoring?.retention_days ?? 30,
                              metrics: prev.monitoring?.metrics ?? ['response_time']
                            }
                          }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metrics">Métriques à surveiller</Label>
                      <Select
                        value={formData.monitoring?.metrics?.[0] || 'response_time'}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            monitoring: {
                              enabled: prev.monitoring?.enabled ?? true,
                              interval: prev.monitoring?.interval ?? 60,
                              intervalSeconds: prev.monitoring?.intervalSeconds ?? 60,
                              retention_days: prev.monitoring?.retention_days ?? 30,
                              metrics: [value, ...(prev.monitoring?.metrics?.filter((m: string) => m !== value) || [])]
                            }
                          }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="response_time">Temps de réponse</SelectItem>
                          <SelectItem value="cpu_usage">Utilisation CPU</SelectItem>
                          <SelectItem value="memory_usage">Utilisation mémoire</SelectItem>
                          <SelectItem value="error_rate">Taux d&apos;erreur</SelectItem>
                          <SelectItem value="query_time">Temps de requête</SelectItem>
                          <SelectItem value="connection_usage">Utilisation connexions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={savePerformanceConfig} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editingConfig ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance Configs List */}
      <div className="grid gap-4">
        {performanceConfigs.map((config) => (
          <Card key={config.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getCategoryIcon(config.category as PerformanceCategory)}
                    <h3 className="text-lg font-semibold">{getCategoryLabel(config.category as PerformanceCategory)}</h3>
                    <Badge variant="outline">{config.category}</Badge>
                    <Badge variant={config.isActive ? 'default' : 'secondary'}>
                      {config.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Paramètres:</h4>
                      <ul className="space-y-1">
                        {Object.entries(config.settings || {}).slice(0, 3).map(([key, value]) => (
                          <li key={key} className="text-gray-600">
                            {key}: {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : value}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Seuils:</h4>
                      <ul className="space-y-1">
                         {Object.entries(config.thresholds || {}).slice(0, 3).map(([key, threshold]) => (
                           <li key={key} className="text-gray-600">
                              {key}: {typeof threshold === 'object' && threshold && 'value' in threshold && 'unit' in threshold ? `${(threshold as PerformanceThreshold).value} ${(threshold as PerformanceThreshold).unit}` : String(threshold)}
                           </li>
                         ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Monitoring:</h4>
                      <p className="text-gray-600">
                        {config.monitoring?.enabled ? 'Activé' : 'Désactivé'}
                      </p>
                      <p className="text-gray-600">
                        Intervalle: {config.monitoring?.intervalSeconds}s
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleConfigStatus(config)}
                  >
                    {config.isActive ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(config)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmDeletePerformanceConfig(config)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {performanceConfigs.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune configuration de performance
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première configuration de performance pour optimiser votre système
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une configuration
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Supprimer la configuration"
        description={`Voulez-vous vraiment supprimer "${configToDelete?.name || 'cette configuration'}" ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        onConfirm={deletePerformanceConfig}
      />
    </div>
  );
}
