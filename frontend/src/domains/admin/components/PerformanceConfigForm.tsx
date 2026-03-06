'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Save } from 'lucide-react';
import { PerformanceCategory, CreatePerformanceConfigDTO, PerformanceConfig } from '@/shared/types';

interface PerformanceConfigFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingConfig: PerformanceConfig | null;
  formData: CreatePerformanceConfigDTO;
  setFormData: React.Dispatch<React.SetStateAction<CreatePerformanceConfigDTO>>;
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  saving: boolean;
  onSave: () => void;
}

export function PerformanceConfigForm({
  open,
  onOpenChange,
  editingConfig,
  formData,
  setFormData,
  activeSubTab,
  setActiveSubTab,
  saving,
  onSave,
}: PerformanceConfigFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={onSave} disabled={saving}>
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
  );
}
