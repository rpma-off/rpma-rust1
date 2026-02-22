'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Zap,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  Trash2,
  Download,
  Upload,
  Activity,
  AlertTriangle,
  CheckCircle,
  Save,
} from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';
import { UserSession, UserPerformanceSettings } from '@/lib/backend';
import { UserAccount } from '@/types';

// Performance settings form schema
const performanceSchema = z.object({
  cache_enabled: z.boolean(),
  cache_size: z.number().min(50).max(500),
  offline_mode: z.boolean(),
  sync_on_startup: z.boolean(),
  background_sync: z.boolean(),
  image_compression: z.boolean(),
  preload_data: z.boolean(),
});

type PerformanceFormData = z.infer<typeof performanceSchema>;

interface PerformanceSettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

interface CacheStats {
  total_keys: number;
  used_memory_bytes: number;
  used_memory_mb: number;
  hit_rate?: number;
  miss_rate?: number;
  avg_response_time_ms?: number;
  cache_types: CacheTypeInfo[];
}

interface CacheTypeInfo {
  cache_type: string;
  keys_count: number;
  memory_used_mb: number;
  hit_rate?: number;
}

interface SyncStats {
  lastSync: string;
  pendingUploads: number;
  pendingDownloads: number;
  syncStatus: 'idle' | 'syncing' | 'error';
}

interface SyncOperation {
  direction?: string;
  status?: string;
}

interface SyncStatusResponse {
  status?: string;
}

export function PerformanceTab({ user }: PerformanceSettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    total_keys: 0,
    used_memory_bytes: 0,
    used_memory_mb: 0,
    cache_types: [],
  });
  const [syncStats, setSyncStats] = useState<SyncStats>({
    lastSync: '',
    pendingUploads: 0,
    pendingDownloads: 0,
    syncStatus: 'idle',
  });
  const [isOnline, setIsOnline] = useState(true);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.PERFORMANCE,
    component: 'PerformanceTab',
  });

  const form = useForm<PerformanceFormData>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      cache_enabled: true,
      cache_size: 100,
      offline_mode: false,
      sync_on_startup: true,
      background_sync: true,
      image_compression: true,
      preload_data: false,
    },
  });

  // Load performance settings and stats
  useEffect(() => {
    const loadPerformanceData = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        // Load performance settings from user settings
        const userSettings = await ipcClient.settings.getUserSettings(user.token);

        // Apply performance settings if available
        if (userSettings?.performance) {
          form.reset(userSettings.performance as UserPerformanceSettings);
        }

        // Load real cache statistics
        try {
          const cacheStatsResponse = await ipcClient.performance.getCacheStatistics(user.token) as unknown as CacheStats;
          setCacheStats(cacheStatsResponse);
        } catch (error) {
          logError('Failed to load cache statistics', { error: error instanceof Error ? error.message : error });
          // Fallback to mock data
          setCacheStats({
            total_keys: 0,
            used_memory_bytes: 0,
            used_memory_mb: 0,
            cache_types: [],
          });
        }

        setSyncStats({
          lastSync: new Date(Date.now() - 1800000).toISOString(),
          pendingUploads: 3,
          pendingDownloads: 0,
          syncStatus: 'idle',
        });

        setIsOnline(navigator.onLine);

        logInfo('Performance data loaded successfully');
      } catch (error) {
        logError('Failed to load performance data', { error: error instanceof Error ? error.message : error });
      } finally {
        setIsLoading(false);
      }
    };

    loadPerformanceData();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [logInfo, logError, form, user?.token]);

  const onSubmit = async (data: PerformanceFormData) => {
    if (!user?.token) {
      setSaveError('No authentication token available');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    logUserAction('Performance settings update initiated', {
      changedFields: Object.keys(form.formState.dirtyFields),
      userId: user.user_id
    });

    try {
      await ipcClient.settings.updateUserPerformance(data, user.token);

      setSaveSuccess(true);
      logInfo('Performance settings updated successfully', { userId: user.user_id });

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error saving performance settings';
      setSaveError(errorMessage);
      logError('Performance settings update failed', { error: errorMessage, userId: user.user_id });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!user?.token) return;

    logUserAction('Cache clear initiated');

    try {
      await ipcClient.performance.clearApplicationCache({}, user.token);

      // Reload cache statistics
      const cacheStatsResponse = await ipcClient.performance.getCacheStatistics(user.token) as unknown as CacheStats;
      setCacheStats(cacheStatsResponse);

      logInfo('Cache cleared successfully');
    } catch (error) {
      logError('Cache clear failed', { error: error instanceof Error ? error.message : error });
    }
  };

  const handleForceSync = async () => {
    if (!user?.token) return;

    logUserAction('Manual sync initiated');

    try {
      setSyncStats(prev => ({ ...prev, syncStatus: 'syncing' }));

      // Use the real sync command
      await ipcClient.sync.syncNow();

      // Get updated sync status
      const syncStatus = await ipcClient.sync.getStatus() as SyncStatusResponse;
      const operations = await ipcClient.sync.getOperationsForEntity('all', 'all') as SyncOperation[] | unknown;
      const operationList = Array.isArray(operations) ? operations : [];

      setSyncStats(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        pendingUploads: operationList.filter((op) => op.direction === 'upload' && op.status === 'pending').length,
        pendingDownloads: operationList.filter((op) => op.direction === 'download' && op.status === 'pending').length,
        syncStatus: syncStatus?.status === 'running' ? 'syncing' : 'idle',
      }));

      logInfo('Manual sync completed successfully');
    } catch (error) {
      setSyncStats(prev => ({ ...prev, syncStatus: 'error' }));
      logError('Manual sync failed', { error: error instanceof Error ? error.message : error });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Paramètres de performance mis à jour avec succès
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="font-medium">
                {isOnline ? 'Connecté' : 'Hors ligne'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOnline
                  ? 'Synchronisation automatique activée'
                  : 'Fonctionnement en mode hors ligne'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Connectivity Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Connectivité et démarrage
              </CardTitle>
               <CardDescription>
                 Configurez le mode hors ligne et la synchronisation au démarrage
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="offline_mode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Mode hors ligne</FormLabel>
                      <FormDescription>
                        Active un comportement optimisé pour les connexions instables
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Cache Management Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gestion du cache
              </CardTitle>
               <CardDescription>
                 Contrôlez l&apos;utilisation du cache pour optimiser les performances
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="cache_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Cache activé</FormLabel>
                      <FormDescription>
                        Utiliser le cache local pour améliorer les performances
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cache_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taille maximale du cache</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="50"
                        max="500"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Espace maximum alloué au cache local (50-500 MB)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

               {/* Cache Statistics */}
               <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                 <h4 className="text-sm font-medium">Statistiques du cache</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-sm text-muted-foreground">Utilisation mémoire</p>
                     <div className="flex items-center gap-2">
                       <Progress value={Math.min((cacheStats.used_memory_mb / 512) * 100, 100)} className="flex-1" />
                       <span className="text-sm font-medium">
                         {cacheStats.used_memory_mb.toFixed(2)} MB
                       </span>
                     </div>
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground">Total des clés</p>
                     <p className="text-sm font-medium">{cacheStats.total_keys.toLocaleString()}</p>
                   </div>
                 </div>

                 {/* Cache Types Breakdown */}
                 {cacheStats.cache_types.length > 0 && (
                   <div className="space-y-2">
                     <p className="text-sm text-muted-foreground">Répartition par type:</p>
                     <div className="space-y-1">
                       {cacheStats.cache_types.map((cacheType) => (
                         <div key={cacheType.cache_type} className="flex justify-between text-xs">
                           <span>{cacheType.cache_type}</span>
                           <span>{cacheType.keys_count} clés ({cacheType.memory_used_mb.toFixed(2)} MB)</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Performance Metrics */}
                 {(cacheStats.hit_rate !== undefined || cacheStats.avg_response_time_ms !== undefined) && (
                   <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                     {cacheStats.hit_rate !== undefined && (
                       <div>
                         <p className="text-sm text-muted-foreground">Taux de succès</p>
                         <p className="text-sm font-medium">{(cacheStats.hit_rate * 100).toFixed(1)}%</p>
                       </div>
                     )}
                     {cacheStats.avg_response_time_ms !== undefined && (
                       <div>
                         <p className="text-sm text-muted-foreground">Temps de réponse</p>
                         <p className="text-sm font-medium">{cacheStats.avg_response_time_ms.toFixed(1)} ms</p>
                       </div>
                     )}
                   </div>
                 )}

                 <div className="flex items-center justify-end pt-2">
                   <Button variant="outline" size="sm" onClick={handleClearCache}>
                     <Trash2 className="h-4 w-4 mr-2" />
                     Vider le cache
                   </Button>
                 </div>
               </div>
            </CardContent>
          </Card>

          {/* Synchronization Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Synchronisation
              </CardTitle>
              <CardDescription>
                Gérez les paramètres de synchronisation avec le serveur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sync_on_startup"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Sync au démarrage</FormLabel>
                        <FormDescription>
                          Synchroniser les données au lancement de l&apos;application
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="background_sync"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Sync en arrière-plan</FormLabel>
                        <FormDescription>
                          Synchroniser automatiquement en arrière-plan
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Sync Statistics */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">État de la synchronisation</h4>
                  <div className="flex items-center gap-2">
                    {syncStats.syncStatus === 'syncing' && <Badge variant="secondary">Synchronisation...</Badge>}
                    {syncStats.syncStatus === 'error' && <Badge variant="destructive">Erreur</Badge>}
                    {syncStats.syncStatus === 'idle' && <Badge variant="outline">Inactif</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dernière sync</p>
                    <p className="text-sm font-medium">
                      {syncStats.lastSync ? new Date(syncStats.lastSync).toLocaleString('fr-FR') : 'Jamais'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">En attente</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        <span className="text-sm">{syncStats.pendingUploads}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        <span className="text-sm">{syncStats.pendingDownloads}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceSync}
                  disabled={syncStats.syncStatus === 'syncing' || !isOnline}
                  className="w-full"
                >
                  {syncStats.syncStatus === 'syncing' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Forcer la synchronisation
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Performance Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Options supplémentaires
              </CardTitle>
              <CardDescription>
                Paramètres avancés pour optimiser les performances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="image_compression"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Compression d&apos;images</FormLabel>
                        <FormDescription>
                          Compresser automatiquement les images pour économiser l&apos;espace
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preload_data"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Préchargement des données</FormLabel>
                        <FormDescription>
                          Précharger les données fréquemment utilisées
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-6 border-t">
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sauvegarder les paramètres
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSaving}
            >
              Réinitialiser
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
