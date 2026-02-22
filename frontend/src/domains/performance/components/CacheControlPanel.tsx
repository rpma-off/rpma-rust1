'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Trash2, Settings } from 'lucide-react';
import { usePerformance } from '../api';
import type { CacheSettings } from '../api/types';

export function CacheControlPanel() {
  const { cacheStats, loading, clearCache, updateCacheSettings } = usePerformance();

  const [settings, setSettings] = useState<Partial<CacheSettings>>({
    max_memory_mb: 512,
    default_ttl_seconds: 3600,
    enable_disk_cache: true,
  });

  const [selectedCacheTypes, setSelectedCacheTypes] = useState<string[]>(['memory', 'disk']);

  const handleClearCache = async () => {
    await clearCache(selectedCacheTypes);
  };

  const handleUpdateSettings = async () => {
    await updateCacheSettings(settings);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const hitRate = cacheStats ? (cacheStats.hit_rate * 100).toFixed(1) : '0';

  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Contrôle du cache
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Entrées totales</Label>
            <div className="text-2xl font-bold">{cacheStats?.total_entries || 0}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Taille totale</Label>
            <div className="text-2xl font-bold">{formatBytes(cacheStats?.total_size_bytes || 0)}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Taux de réussite</Label>
            <div className="text-2xl font-bold">{hitRate}%</div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="max-memory">Mémoire max (MB)</Label>
              <Input
                id="max-memory"
                type="number"
                value={settings.max_memory_mb}
                onChange={(e) => setSettings({ ...settings, max_memory_mb: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="default-ttl">TTL par défaut (secondes)</Label>
              <Input
                id="default-ttl"
                type="number"
                value={settings.default_ttl_seconds}
                onChange={(e) => setSettings({ ...settings, default_ttl_seconds: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <Button onClick={handleUpdateSettings} variant="outline" disabled={loading} className="w-full">
            Mettre à jour les paramètres
          </Button>
        </div>

        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Vider le cache
          </h4>
          <div className="space-y-4">
            <div>
              <Label>Types de cache à vider</Label>
              <Select
                value={selectedCacheTypes.join(',')}
                onValueChange={(value) => setSelectedCacheTypes(value.split(','))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="memory">Mémoire</SelectItem>
                  <SelectItem value="disk">Disque</SelectItem>
                  <SelectItem value="memory,disk">Tous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleClearCache} variant="destructive" disabled={loading} className="w-full">
              Vider le cache
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
