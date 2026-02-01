'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/hooks/useMessage';
import type { UpdateNotificationPreferencesRequest } from '@/lib/backend';
import { Bell, Mail, MessageSquare, Clock, Save } from 'lucide-react';

interface NotificationPreferencesProps {
  userId: string;
}

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const { preferences, loading, error, updatePreferences } = useNotificationPreferences(userId);
  const [localPrefs, setLocalPrefs] = useState<UpdateNotificationPreferencesRequest>({
    email_enabled: null,
    sms_enabled: null,
    in_app_enabled: null,
    task_assigned: null,
    task_updated: null,
    task_completed: null,
    task_overdue: null,
    client_created: null,
    client_updated: null,
    system_alerts: null,
    maintenance_notifications: null,
    quiet_hours_enabled: null,
    quiet_hours_start: null,
    quiet_hours_end: null,
    email_frequency: null,
    email_digest_time: null,
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        in_app_enabled: preferences.in_app_enabled,
        task_assigned: preferences.task_assigned,
        task_updated: preferences.task_updated,
        task_completed: preferences.task_completed,
        task_overdue: preferences.task_overdue,
        client_created: preferences.client_created,
        client_updated: preferences.client_updated,
        system_alerts: preferences.system_alerts,
        maintenance_notifications: preferences.maintenance_notifications,
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        quiet_hours_start: preferences.quiet_hours_start || null,
        quiet_hours_end: preferences.quiet_hours_end || null,
        email_frequency: preferences.email_frequency,
        email_digest_time: preferences.email_digest_time,
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    const result = await updatePreferences(userId, localPrefs);
    if (result.success) {
      // Preferences updated successfully
    }
  };

  const updatePreference = (key: keyof UpdateNotificationPreferencesRequest, value: any) => {
    setLocalPrefs((prev: any) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="p-4">Chargement des préférences...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive">Erreur: {error}</div>;
  }

  if (!preferences) {
    return <div className="p-4">Aucune préférence trouvée</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Préférences de notification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Communication Channels */}
        <div>
          <h3 className="text-lg font-medium mb-4">Canaux de communication</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <div>
                  <Label htmlFor="email-enabled">Notifications par email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des notifications par email
                  </p>
                </div>
              </div>
              <Switch
                id="email-enabled"
                checked={localPrefs.email_enabled ?? false}
                onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <div>
                  <Label htmlFor="sms-enabled">Notifications par SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des notifications par SMS (coûts supplémentaires possibles)
                  </p>
                </div>
              </div>
              <Switch
                id="sms-enabled"
                checked={localPrefs.sms_enabled ?? false}
                onCheckedChange={(checked) => updatePreference('sms_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <div>
                  <Label htmlFor="in-app-enabled">Notifications in-app</Label>
                  <p className="text-sm text-muted-foreground">
                    Afficher les notifications dans l&apos;application
                  </p>
                </div>
              </div>
              <Switch
                id="in-app-enabled"
                checked={localPrefs.in_app_enabled ?? true}
                onCheckedChange={(checked) => updatePreference('in_app_enabled', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Task Notifications */}
        <div>
          <h3 className="text-lg font-medium mb-4">Notifications de tâches</h3>
          <div className="space-y-4">
            {[
              { key: 'task_assigned', label: 'Tâche assignée', desc: 'Quand une tâche vous est assignée' },
              { key: 'task_updated', label: 'Tâche mise à jour', desc: 'Quand une tâche assignée est modifiée' },
              { key: 'task_completed', label: 'Tâche terminée', desc: 'Quand une tâche assignée est terminée' },
              { key: 'task_overdue', label: 'Tâche en retard', desc: 'Quand une tâche assignée est en retard' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={key}>{label}</Label>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={key}
                  checked={(localPrefs as any)[key] ?? true}
                  onCheckedChange={(checked) => updatePreference(key as keyof UpdateNotificationPreferencesRequest, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Client Notifications */}
        <div>
          <h3 className="text-lg font-medium mb-4">Notifications de clients</h3>
          <div className="space-y-4">
            {[
              { key: 'client_created', label: 'Nouveau client', desc: 'Quand un nouveau client est créé' },
              { key: 'client_updated', label: 'Client mis à jour', desc: 'Quand un client est modifié' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={key}>{label}</Label>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={key}
                  checked={(localPrefs as any)[key] ?? true}
                  onCheckedChange={(checked) => updatePreference(key as keyof UpdateNotificationPreferencesRequest, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* System Notifications */}
        <div>
          <h3 className="text-lg font-medium mb-4">Notifications système</h3>
          <div className="space-y-4">
            {[
              { key: 'system_alerts', label: 'Alertes système', desc: 'Alertes importantes du système' },
              { key: 'maintenance_notifications', label: 'Maintenance', desc: 'Notifications de maintenance programmée' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={key}>{label}</Label>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={key}
                  checked={(localPrefs as any)[key] ?? true}
                  onCheckedChange={(checked) => updatePreference(key as keyof UpdateNotificationPreferencesRequest, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div>
          <h4 className="text-sm font-medium mb-2">Heures silencieuses</h4>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="quiet-hours-enabled">Activer les heures silencieuses</Label>
              <p className="text-xs text-muted-foreground">Ne pas déranger pendant les heures définies</p>
            </div>
            <Switch
              id="quiet-hours-enabled"
              checked={localPrefs.quiet_hours_enabled ?? false}
              onCheckedChange={(checked) => updatePreference('quiet_hours_enabled', checked)}
            />
          </div>

          {localPrefs.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="quiet-start">Heure de début</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={localPrefs.quiet_hours_start || ''}
                  onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quiet-end">Heure de fin</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={localPrefs.quiet_hours_end || ''}
                  onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Email Settings */}
        {localPrefs.email_enabled && (
          <div>
            <h3 className="text-lg font-medium mb-4">Paramètres d&apos;email</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-frequency">Fréquence des emails</Label>
                <Select
                  value={localPrefs.email_frequency || 'immediate'}
                  onValueChange={(value) => updatePreference('email_frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immédiat</SelectItem>
                    <SelectItem value="daily">Quotidien</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(localPrefs.email_frequency === 'daily' || localPrefs.email_frequency === 'weekly') && (
                <div>
                  <Label htmlFor="email-digest-time">Heure d&apos;envoi du résumé</Label>
                  <Input
                    id="email-digest-time"
                    type="time"
                    value={localPrefs.email_digest_time || '09:00'}
                    onChange={(e) => updatePreference('email_digest_time', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder les préférences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}