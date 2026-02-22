'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import {
  Bell,
  Monitor,
  Globe,
  Accessibility,
  Save,
  AlertCircle,
  CheckCircle,
  Moon,
  Sun,
  Languages
} from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';
import {
  UserSession,
  UserPreferences,
  UserNotificationSettings,
  UserAccessibilitySettings,
} from '@/lib/backend';
import { UserAccount } from '@/types';
import { SettingsErrorHandler } from '@/lib/utils/settings-error-handler';

// Combined form data type for all preference sections
type PreferencesFormData = {
  preferences: UserPreferences;
  notifications: UserNotificationSettings;
  accessibility: UserAccessibilitySettings;
};

interface PreferencesSettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

export function PreferencesTab({ user }: PreferencesSettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.USER,
    component: 'PreferencesTab',
  });

  const form = useForm<PreferencesFormData>({
    defaultValues: {
      preferences: {
        email_notifications: true,
        push_notifications: true,
        task_assignments: true,
        task_updates: true,
        system_alerts: true,
        weekly_reports: false,
        theme: 'system',
        language: 'fr',
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        high_contrast: false,
        large_text: false,
        reduce_motion: false,
        screen_reader: false,
        auto_refresh: true,
        refresh_interval: 60,
      },
      notifications: {
        email_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
        task_assigned: true,
        task_updated: true,
        task_completed: false,
        task_overdue: true,
        system_alerts: true,
        maintenance: false,
        security_alerts: true,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        digest_frequency: 'never',
        batch_notifications: false,
        sound_enabled: true,
        sound_volume: 70,
      },
      accessibility: {
        high_contrast: false,
        large_text: false,
        reduce_motion: false,
        screen_reader: false,
        focus_indicators: true,
        keyboard_navigation: true,
        text_to_speech: false,
        speech_rate: 1,
        font_size: 16,
        color_blind_mode: 'none',
      },
    },
  });

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        const settings = await ipcClient.settings.getUserSettings(user.token);

        // Apply loaded preferences to form
        if (settings) {
          form.reset({
            preferences: settings.preferences,
            notifications: settings.notifications,
            accessibility: settings.accessibility,
          });
        }

        logInfo('Preferences loaded successfully', { userId: user.user_id });
      } catch (error) {
        logError('Failed to load preferences', {
          error: error instanceof Error ? error.message : error,
          userId: user.user_id
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.token, user?.user_id, form, logInfo, logError]);

  const onSubmit = async (data: PreferencesFormData) => {
    if (!user?.token) {
      setSaveError('Session expirée. Veuillez vous reconnecter.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    logUserAction('Preferences update initiated', {
      sections: Object.keys(data),
      userId: user.user_id
    });

    try {
      // Update each settings section individually
      const updatePromises = [];
      const dirtyFields = form.formState.dirtyFields as {
        preferences?: Record<string, unknown>;
        notifications?: Record<string, unknown>;
        accessibility?: Record<string, unknown>;
      };

      if (dirtyFields.preferences && Object.keys(dirtyFields.preferences).length > 0) {
        updatePromises.push(
          ipcClient.settings.updateUserPreferences(data.preferences, user.token)
        );
      }

      if (dirtyFields.notifications && Object.keys(dirtyFields.notifications).length > 0) {
        updatePromises.push(
          ipcClient.settings.updateUserNotifications(data.notifications, user.token)
        );
      }

      if (dirtyFields.accessibility && Object.keys(dirtyFields.accessibility).length > 0) {
        updatePromises.push(
          ipcClient.settings.updateUserAccessibility(data.accessibility, user.token)
        );
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      setSaveSuccess(true);
      logInfo('All preferences updated successfully', {
        userId: user.user_id,
        sectionsUpdated: Object.keys(data).filter(key => Object.keys(data[key as keyof typeof data]).length > 0)
      });

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      const settingsError = SettingsErrorHandler.handleApiError(error, 'preferences_update');

      setSaveError(settingsError.message);
      logError('Preferences update failed', {
        error: settingsError,
        userId: user.user_id,
        sectionsAttempted: Object.keys(data),
        retryable: SettingsErrorHandler.isRetryableError(settingsError)
      });
    } finally {
      setIsSaving(false);
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
            Préférences mises à jour avec succès
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de notification pour rester informé des activités importantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="notifications.email_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Notifications par email</FormLabel>
                        <FormDescription>
                          Recevoir des notifications par email pour les événements importants
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
                  name="notifications.push_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Notifications push</FormLabel>
                        <FormDescription>
                          Recevoir des notifications push dans l&apos;application
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
                  name="notifications.task_assigned"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Nouvelles tâches</FormLabel>
                        <FormDescription>
                          Être notifié lors de l&apos;assignation de nouvelles tâches
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
                  name="notifications.task_updated"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Mises à jour des tâches</FormLabel>
                        <FormDescription>
                          Recevoir des notifications pour les changements de statut des tâches
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
                  name="notifications.system_alerts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Alertes système</FormLabel>
                        <FormDescription>
                          Notifications pour les maintenances et problèmes système
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
                  name="preferences.weekly_reports"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Rapports hebdomadaires</FormLabel>
                        <FormDescription>
                          Recevoir un résumé hebdomadaire de vos activités
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

          {/* Display Options Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Affichage
              </CardTitle>
              <CardDescription>
                Personnalisez l&apos;apparence et le comportement de l&apos;interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="preferences.theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thème</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un thème" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2">
                              <Sun className="h-4 w-4" />
                              Clair
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4" />
                              Sombre
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4" />
                              Système
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choisissez le thème d&apos;affichage de l&apos;application
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferences.language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Langue</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une langue" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fr">
                            <div className="flex items-center gap-2">
                              <Languages className="h-4 w-4" />
                              Français
                            </div>
                          </SelectItem>
                          <SelectItem value="en">
                            <div className="flex items-center gap-2">
                              <Languages className="h-4 w-4" />
                              Anglais
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Langue d&apos;affichage de l&apos;interface
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferences.date_format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format de date</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Format de date" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">31/12/2023</SelectItem>
                          <SelectItem value="MM/DD/YYYY">12/31/2023</SelectItem>
                          <SelectItem value="YYYY-MM-DD">2023-12-31</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Format d&apos;affichage des dates dans l&apos;application
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferences.time_format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format d&apos;heure</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Format d&apos;heure" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="24h">24 heures (14:30)</SelectItem>
                          <SelectItem value="12h">12 heures (2:30 PM)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Format d&apos;affichage des heures
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Accessibility Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Accessibilité
              </CardTitle>
              <CardDescription>
                Options d&apos;accessibilité pour améliorer l&apos;utilisation de l&apos;application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="accessibility.high_contrast"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Contraste élevé</FormLabel>
                        <FormDescription>
                          Augmente le contraste pour une meilleure visibilité
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
                  name="accessibility.large_text"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Texte agrandi</FormLabel>
                        <FormDescription>
                          Augmente la taille du texte dans l&apos;interface
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
                  name="accessibility.reduce_motion"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Réduire les animations</FormLabel>
                        <FormDescription>
                          Désactive les animations pour éviter les distractions
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
                  name="accessibility.screen_reader"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Lecteur d&apos;écran</FormLabel>
                        <FormDescription>
                          Optimisations pour les lecteurs d&apos;écran
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

          {/* Performance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Performance
              </CardTitle>
              <CardDescription>
                Paramètres de performance et de synchronisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="preferences.auto_refresh"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Actualisation automatique</FormLabel>
                        <FormDescription>
                          Actualiser automatiquement les données en arrière-plan
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
                  name="preferences.refresh_interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervalle d&apos;actualisation (secondes)</FormLabel>
                      <FormControl>
                        <input
                          type="number"
                          min="30"
                          max="300"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Fréquence d&apos;actualisation des données (30-300 secondes)
                      </FormDescription>
                      <FormMessage />
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
