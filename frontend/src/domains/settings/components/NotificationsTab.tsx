'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bell,
  Mail,
  Smartphone,
  Monitor,
  Clock,
  AlertTriangle,
  CheckCircle,
  Save,
  TestTube,
  Volume2,
} from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';
import { UserSession } from '@/lib/backend';
import { UserAccount } from '@/types';

// Notification settings form schema
const notificationsSchema = z.object({
  // Channels
  email_enabled: z.boolean(),
  push_enabled: z.boolean(),
  in_app_enabled: z.boolean(),

  // Task notifications
  task_assigned: z.boolean(),
  task_updated: z.boolean(),
  task_completed: z.boolean(),
  task_overdue: z.boolean(),

  // System notifications
  system_alerts: z.boolean(),
  maintenance: z.boolean(),
  security_alerts: z.boolean(),

  // Schedule
  quiet_hours_enabled: z.boolean(),
  quiet_hours_start: z.string(),
  quiet_hours_end: z.string(),

  // Frequency
  digest_frequency: z.enum(['never', 'daily', 'weekly']),
  batch_notifications: z.boolean(),

  // Sound
  sound_enabled: z.boolean(),
  sound_volume: z.number().min(0).max(100),
});

type NotificationsFormData = z.infer<typeof notificationsSchema>;

interface NotificationsSettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

export function NotificationsTab({ user }: NotificationsSettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.USER,
    component: 'NotificationsTab',
  });

  const form = useForm<NotificationsFormData>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      // Channels
      email_enabled: true,
      push_enabled: true,
      in_app_enabled: true,

      // Task notifications
      task_assigned: true,
      task_updated: true,
      task_completed: false,
      task_overdue: true,

      // System notifications
      system_alerts: true,
      maintenance: false,
      security_alerts: true,

      // Schedule
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',

      // Frequency
      digest_frequency: 'never',
      batch_notifications: false,

      // Sound
      sound_enabled: true,
      sound_volume: 70,
    },
  });

  // Load notification settings
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        const userSettings = await ipcClient.settings.getUserSettings(user.token);

        // Apply notification settings if available
        if (userSettings?.notifications) {
          form.reset(userSettings.notifications as unknown as NotificationsFormData);
        }

        logInfo('Notification settings loaded successfully', { userId: user.user_id });
      } catch (error) {
        logError('Failed to load notification settings', {
          error: error instanceof Error ? error.message : error,
          userId: user.user_id
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadNotificationSettings();
  }, [form, logInfo, logError, user?.token, user?.user_id]);

  const onSubmit = async (data: NotificationsFormData) => {
    if (!user?.token) {
      setSaveError('No authentication token available');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    logUserAction('Notification settings update initiated', {
      changedFields: Object.keys(form.formState.dirtyFields),
      userId: user.user_id
    });

    try {
      await ipcClient.settings.updateUserNotifications(data, user.token);

      setSaveSuccess(true);
      logInfo('Notification settings updated successfully', { userId: user.user_id });

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error saving notification settings';
      setSaveError(errorMessage);
      logError('Notification settings update failed', { error: errorMessage, userId: user.user_id });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    logUserAction('Test notification sent');

    try {
      // Get current user email for testing
      if (!user?.email) {
        throw new Error('No email address available for current user');
      }

      // Send test notification using the configured notification channel
      await ipcClient.notifications.testConfig(
        user.email,
        'email', // Default to email for testing
        user.token
      );

      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);

      logInfo('Test notification sent successfully');
    } catch (error) {
      logError('Test notification failed', { error: error instanceof Error ? error.message : error });
      throw error; // Re-throw to show error to user
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
            Préférences de notification mises à jour avec succès
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {testNotificationSent && (
        <Alert className="border-blue-200 bg-blue-50">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Notification de test envoyée. Vérifiez vos canaux activés.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Notification Channels Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Canaux de notification
              </CardTitle>
              <CardDescription>
                Choisissez les canaux par lesquels vous souhaitez recevoir les notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="email_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </FormLabel>
                        <FormDescription>
                          Notifications par email
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
                  name="push_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Push
                        </FormLabel>
                        <FormDescription>
                          Notifications push sur mobile
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
                  name="in_app_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          In-app
                        </FormLabel>
                        <FormDescription>
                          Notifications dans l&apos;application
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

          {/* Task Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications de tâches
              </CardTitle>
              <CardDescription>
                Gérez les notifications liées aux tâches et interventions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="task_assigned"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Nouvelle tâche assignée</FormLabel>
                        <FormDescription>
                          Quand une tâche vous est assignée
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
                  name="task_updated"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Mise à jour de tâche</FormLabel>
                        <FormDescription>
                          Quand une tâche est modifiée
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
                  name="task_completed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Tâche terminée</FormLabel>
                        <FormDescription>
                          Quand une tâche est marquée comme terminée
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
                  name="task_overdue"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Tâche en retard</FormLabel>
                        <FormDescription>
                          Quand une tâche dépasse sa date d&apos;échéance
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

          {/* System Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Notifications système
              </CardTitle>
              <CardDescription>
                Notifications concernant le système et la maintenance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="system_alerts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Alertes système</FormLabel>
                        <FormDescription>
                          Problèmes et alertes importantes
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
                  name="maintenance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Maintenance</FormLabel>
                        <FormDescription>
                          Mises à jour et maintenance programmée
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
                  name="security_alerts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Alertes sécurité</FormLabel>
                        <FormDescription>
                          Problèmes de sécurité et accès suspects
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

          {/* Schedule and Frequency Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Programmation et fréquence
              </CardTitle>
              <CardDescription>
                Contrôlez quand et comment recevoir les notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="quiet_hours_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Heures calmes</FormLabel>
                      <FormDescription>
                        Désactiver les notifications pendant certaines heures
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

              {form.watch('quiet_hours_enabled') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4 border-l-2 border-muted">
                  <FormField
                    control={form.control}
                    name="quiet_hours_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure de début</FormLabel>
                        <FormControl>
                          <input
                            type="time"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quiet_hours_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure de fin</FormLabel>
                        <FormControl>
                          <input
                            type="time"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="digest_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fréquence des résumés</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner la fréquence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="never">Jamais</SelectItem>
                        <SelectItem value="daily">Quotidien</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Recevoir un résumé périodique des activités
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batch_notifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Regrouper les notifications</FormLabel>
                      <FormDescription>
                        Regrouper les notifications similaires pour éviter la surcharge
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

          {/* Sound Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Paramètres sonores
              </CardTitle>
              <CardDescription>
                Contrôlez les sons et alertes audio des notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="sound_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Sons activés</FormLabel>
                      <FormDescription>
                        Jouer des sons pour les notifications
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
                name="sound_volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume des notifications: {field.value}%</FormLabel>
                    <FormControl>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Ajustez le volume des sons de notification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Test Notification */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Tester les notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Envoyer une notification de test à tous vos canaux activés
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleTestNotification}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Tester
                </Button>
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
              Sauvegarder les préférences
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
