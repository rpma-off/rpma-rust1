'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Save, Settings } from 'lucide-react';
import { useAnalyticsSummary } from '../hooks/useAnalyticsSummary';

type TrendWindow = '7d' | '30d' | '90d';
type AnomalySensitivity = 'low' | 'medium' | 'high';

interface AnalyticsSettingsState {
  autoRefreshEnabled: boolean;
  refreshIntervalMinutes: number;
  defaultTrendWindow: TrendWindow;
  anomalySensitivity: AnomalySensitivity;
  includeRevenueInExports: boolean;
  includeQualitySignalsInExports: boolean;
  weeklyDigestEnabled: boolean;
}

const STORAGE_KEY = 'rpma.analytics.settings';
const DEFAULT_SETTINGS: AnalyticsSettingsState = {
  autoRefreshEnabled: true,
  refreshIntervalMinutes: 15,
  defaultTrendWindow: '30d',
  anomalySensitivity: 'medium',
  includeRevenueInExports: true,
  includeQualitySignalsInExports: true,
  weeklyDigestEnabled: true,
};

export function AnalyticsSettings() {
  const { summary, refetch } = useAnalyticsSummary();
  const [settings, setSettings] = useState<AnalyticsSettingsState>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const recommendedRefresh = useMemo(() => {
    if (!summary) return 15;
    return summary.completed_today >= 10 ? 5 : 15;
  }, [summary]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AnalyticsSettingsState>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSavedAt(new Date().toISOString());
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setSavedAt(new Date().toISOString());
  };

  if (!isHydrated) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading analytics settings...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="rpma-shell">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Analytics Settings
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync
            </Button>
            <Button variant="outline" onClick={resetSettings}>
              Reset
            </Button>
            <Button onClick={saveSettings}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Recommended refresh: {recommendedRefresh} min</Badge>
          {savedAt ? (
            <Badge variant="outline">Saved: {new Date(savedAt).toLocaleString('fr-FR')}</Badge>
          ) : (
            <Badge variant="outline">Unsaved changes are local</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-md border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="auto-refresh" className="text-sm font-medium text-foreground">
                Enable auto-refresh
              </Label>
              <Switch
                id="auto-refresh"
                checked={settings.autoRefreshEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, autoRefreshEnabled: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refresh-interval">Refresh interval (minutes)</Label>
              <Input
                id="refresh-interval"
                type="number"
                min={1}
                max={120}
                value={settings.refreshIntervalMinutes}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    refreshIntervalMinutes: Math.max(1, Number.parseInt(event.target.value || '1', 10)),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Default trend window</Label>
              <Select
                value={settings.defaultTrendWindow}
                onValueChange={(value: TrendWindow) =>
                  setSettings((prev) => ({ ...prev, defaultTrendWindow: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border p-4">
            <div className="space-y-2">
              <Label>Anomaly sensitivity</Label>
              <Select
                value={settings.anomalySensitivity}
                onValueChange={(value: AnomalySensitivity) =>
                  setSettings((prev) => ({ ...prev, anomalySensitivity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="include-revenue">Include revenue in exports</Label>
              <Switch
                id="include-revenue"
                checked={settings.includeRevenueInExports}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, includeRevenueInExports: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="include-quality">Include quality signals in exports</Label>
              <Switch
                id="include-quality"
                checked={settings.includeQualitySignalsInExports}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, includeQualitySignalsInExports: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="weekly-digest">Enable weekly digest</Label>
              <Switch
                id="weekly-digest"
                checked={settings.weeklyDigestEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, weeklyDigestEnabled: checked }))
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
